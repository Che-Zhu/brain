package project

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Project GVR: example.crossplane.io/v1 Project (claim).
var ProjectGVR = schema.GroupVersionResource{
	Group:    "example.crossplane.io",
	Version:  "v1",
	Resource: "projects",
}

const (
	shareSecretKey = "share-secret"
	shareJWTIssuer = "sealos-api-project-share"
	shareTokenTTL  = 30 * 24 * time.Hour
)

// ErrProjectUIDMismatch means the claim metadata.uid does not match the Project resource.
var ErrProjectUIDMismatch = errors.New("project uid mismatch")

// ShareClaims are embedded in the preview JWT (signed with the per-permission share secret).
type ShareClaims struct {
	ProjectName string `json:"projectName"`
	ProjectUID  string `json:"projectUid"`
	Namespace   string `json:"namespace"`
	Perm        string `json:"perm"`
	jwt.RegisteredClaims
}

// IssueShareJWT verifies the Project, ensures a namespaced Secret with a deterministic name
// exists (create with random key if missing), sets spec.public=true on the Project, and returns
// an HS256 JWT signed with the secret key (same key for re-issue until the Secret is deleted/rotated).
func IssueShareJWT(ctx context.Context, restConfig *rest.Config, namespace, projectName, projectUID, permission string) (token string, expiresAt time.Time, err error) {
	permission = normalizePermission(permission)
	if permission == "" {
		return "", time.Time{}, fmt.Errorf("invalid permission")
	}

	dyn, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return "", time.Time{}, err
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return "", time.Time{}, err
	}

	obj, err := dyn.Resource(ProjectGVR).Namespace(namespace).Get(ctx, projectName, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return "", time.Time{}, err
		}
		return "", time.Time{}, fmt.Errorf("get project: %w", err)
	}
	if string(obj.GetUID()) != projectUID {
		return "", time.Time{}, ErrProjectUIDMismatch
	}

	secretName := ShareSecretName(projectName, permission)
	secretInterface := clientset.CoreV1().Secrets(namespace)

	shareKey, err := getOrCreateShareSecret(ctx, secretInterface, secretName, namespace, projectName, types.UID(projectUID), permission)
	if err != nil {
		return "", time.Time{}, err
	}

	if err := patchProjectPublic(ctx, dyn, namespace, projectName); err != nil {
		return "", time.Time{}, fmt.Errorf("patch project public: %w", err)
	}

	now := time.Now().UTC()
	expiresAt = now.Add(shareTokenTTL)
	claims := ShareClaims{
		ProjectName: projectName,
		ProjectUID:  projectUID,
		Namespace:   namespace,
		Perm:        permission,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    shareJWTIssuer,
			Subject:   fmt.Sprintf("%s/%s", namespace, projectName),
		},
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err = tok.SignedString(shareKey)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign jwt: %w", err)
	}
	return token, expiresAt, nil
}

func normalizePermission(p string) string {
	p = strings.ToLower(strings.TrimSpace(p))
	if p == "" {
		return "view"
	}
	// Only view supported for now; extend when CRD / RBAC allows more.
	if p == "view" {
		return "view"
	}
	return ""
}

// ShareSecretName is deterministic: project-{name}-share-{perm}, DNS-1123 safe and ≤63 chars.
func ShareSecretName(projectName, permission string) string {
	const prefix = "project-"
	const mid = "-share-"
	namePart := sanitizeDNSLabel(projectName)
	permPart := sanitizeDNSLabel(permission)
	if permPart == "" {
		permPart = "view"
	}
	maxName := 63 - len(prefix) - len(mid) - len(permPart)
	if maxName < 1 {
		maxName = 1
	}
	if len(namePart) > maxName {
		namePart = namePart[:maxName]
	}
	namePart = strings.Trim(namePart, "-")
	if namePart == "" {
		namePart = "p"
	}
	return prefix + namePart + mid + permPart
}

func sanitizeDNSLabel(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		alnum := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		switch {
		case alnum:
			b.WriteRune(r)
			prevDash = false
		case r == '-' || r == '.' || r == '_':
			if b.Len() > 0 && !prevDash {
				b.WriteRune('-')
				prevDash = true
			}
		default:
			if b.Len() > 0 && !prevDash {
				b.WriteRune('-')
				prevDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-.")
	for strings.Contains(out, "--") {
		out = strings.ReplaceAll(out, "--", "-")
	}
	return out
}

func getOrCreateShareSecret(
	ctx context.Context,
	secrets secretGetterCreator,
	name, namespace, projectName string,
	projectUID types.UID,
	permission string,
) ([]byte, error) {
	sec, err := secrets.Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		raw := sec.Data[shareSecretKey]
		if len(raw) == 0 {
			return nil, fmt.Errorf("secret %s/%s missing %s key", namespace, name, shareSecretKey)
		}
		return raw, nil
	}
	if !apierrors.IsNotFound(err) {
		return nil, err
	}

	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return nil, fmt.Errorf("generate share key: %w", err)
	}

	block := true
	controller := false
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				"app.sealos.io/project-share":     "true",
				"app.sealos.io/project-name":      projectName,
				"app.sealos.io/project-permission": permission,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					APIVersion:         "example.crossplane.io/v1",
					Kind:               "Project",
					Name:               projectName,
					UID:                projectUID,
					BlockOwnerDeletion: &block,
					Controller:         &controller,
				},
			},
		},
		Type: corev1.SecretTypeOpaque,
		Data: map[string][]byte{
			shareSecretKey: key,
		},
	}

	_, err = secrets.Create(ctx, secret, metav1.CreateOptions{})
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			sec, gerr := secrets.Get(ctx, name, metav1.GetOptions{})
			if gerr != nil {
				return nil, gerr
			}
			raw := sec.Data[shareSecretKey]
			if len(raw) == 0 {
				return nil, fmt.Errorf("secret %s/%s missing %s after race", namespace, name, shareSecretKey)
			}
			return raw, nil
		}
		return nil, err
	}
	return key, nil
}

type secretGetterCreator interface {
	Get(ctx context.Context, name string, opts metav1.GetOptions) (*corev1.Secret, error)
	Create(ctx context.Context, secret *corev1.Secret, opts metav1.CreateOptions) (*corev1.Secret, error)
}

func patchProjectPublic(ctx context.Context, dyn dynamic.Interface, namespace, projectName string) error {
	patch := []byte(`{"spec":{"public":true}}`)
	_, err := dyn.Resource(ProjectGVR).Namespace(namespace).Patch(
		ctx,
		projectName,
		types.MergePatchType,
		patch,
		metav1.PatchOptions{},
	)
	return err
}
