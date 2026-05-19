package project

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	"sealos/api/middleware"
	"sealos/api/service/authlog"
)

// ProjectUIDLabel matches composed resources (AP, etc.); same as crossplane constants in TS.
const ProjectUIDLabel = "crossplane.io/project-uid"

// APGVR is the namespaced AP claim.
var APGVR = schema.GroupVersionResource{
	Group:    "example.crossplane.io",
	Version:  "v1",
	Resource: "aps",
}

var (
	// ErrShareTokenInvalid is returned when the JWT is malformed, signature fails, or references missing data.
	ErrShareTokenInvalid = errors.New("invalid share token")
	// ErrShareProjectNotPublic when the Project spec.public is not true.
	ErrShareProjectNotPublic = errors.New("project is not public")
	// ErrShareForbidden when perm in token is not allowed for read-only preview.
	ErrShareForbidden = errors.New("share permission not allowed for this operation")
)

// ValidatedShare is the result of verifying a share JWT against the cluster (admin API).
type ValidatedShare struct {
	Claims     *ShareClaims
	ProjectUID string
}

// ValidateShareAccess verifies the HS256 JWT using the share Secret, checks Project is public,
// and returns canonical project UID for label-scoped reads.
func ValidateShareAccess(ctx context.Context, adminCfg *clientcmdapi.Config, rawToken string) (*ValidatedShare, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" || adminCfg == nil {
		authlog.Warn("share validate: rejected empty token or missing admin config")
		return nil, ErrShareTokenInvalid
	}
	authlog.Info("share validate: starting shareToken=%s", authlog.SecretMeta(rawToken))

	parser := jwt.NewParser(jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	var prelim ShareClaims
	_, _, err := jwt.NewParser().ParseUnverified(rawToken, &prelim)
	if err != nil {
		authlog.Warn("share validate: unverified JWT parse failed err=%v", err)
		return nil, fmt.Errorf("%w: %w", ErrShareTokenInvalid, err)
	}
	if strings.ToLower(strings.TrimSpace(prelim.Perm)) != "view" {
		authlog.Warn("share validate: rejected perm=%q (want view)", prelim.Perm)
		return nil, ErrShareForbidden
	}
	ns := strings.TrimSpace(prelim.Namespace)
	pn := strings.TrimSpace(prelim.ProjectName)
	if ns == "" || pn == "" {
		authlog.Warn("share validate: missing namespace or projectName in claims")
		return nil, ErrShareTokenInvalid
	}
	authlog.Info("share validate: claims namespace=%q projectName=%q perm=%q projectUID=%q",
		ns, pn, prelim.Perm, strings.TrimSpace(prelim.ProjectUID))

	restCfg, err := clientcmd.NewDefaultClientConfig(*adminCfg, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return nil, err
	}
	middleware.SuppressK8sRESTWarnings(restCfg)
	dyn, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return nil, err
	}
	clientset, err := kubernetes.NewForConfig(restCfg)
	if err != nil {
		return nil, err
	}

	projObj, err := dyn.Resource(ProjectGVR).Namespace(ns).Get(ctx, pn, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			authlog.Warn("share validate: project not found namespace=%q name=%q", ns, pn)
			return nil, ErrShareTokenInvalid
		}
		authlog.Warn("share validate: get project failed namespace=%q name=%q err=%v", ns, pn, err)
		return nil, err
	}
	canonicalUID := string(projObj.GetUID())
	if pu := strings.TrimSpace(prelim.ProjectUID); pu != "" && pu != canonicalUID {
		authlog.Warn("share validate: project UID mismatch claim=%q canonical=%q", pu, canonicalUID)
		return nil, ErrShareTokenInvalid
	}
	if !projectSpecPublic(projObj) {
		authlog.Warn("share validate: project not public namespace=%q name=%q uid=%q", ns, pn, canonicalUID)
		return nil, ErrShareProjectNotPublic
	}

	secName := ShareSecretName(pn, prelim.Perm)
	sec, err := clientset.CoreV1().Secrets(ns).Get(ctx, secName, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			authlog.Warn("share validate: share secret not found namespace=%q secret=%q", ns, secName)
			return nil, ErrShareTokenInvalid
		}
		authlog.Warn("share validate: get share secret failed namespace=%q secret=%q err=%v", ns, secName, err)
		return nil, err
	}
	key := sec.Data[shareSecretKey]
	if len(key) == 0 {
		authlog.Warn("share validate: share secret missing signing key namespace=%q secret=%q", ns, secName)
		return nil, ErrShareTokenInvalid
	}

	var claims ShareClaims
	_, err = parser.ParseWithClaims(rawToken, &claims, func(t *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil {
		authlog.Warn("share validate: JWT signature verification failed namespace=%q project=%q err=%v", ns, pn, err)
		return nil, fmt.Errorf("%w: %w", ErrShareTokenInvalid, err)
	}

	authlog.Info("share validate: success namespace=%q project=%q projectUID=%q", ns, pn, canonicalUID)

	return &ValidatedShare{Claims: &claims, ProjectUID: canonicalUID}, nil
}

func projectSpecPublic(obj *unstructured.Unstructured) bool {
	b, found, err := unstructured.NestedBool(obj.Object, "spec", "public")
	if err != nil || !found {
		return false
	}
	return b
}

// VerifyAPInShareProject ensures the AP exists in ns and carries the shared project UID label.
func VerifyAPInShareProject(ctx context.Context, adminCfg *clientcmdapi.Config, ns, apName, projectUID string) error {
	restCfg, err := clientcmd.NewDefaultClientConfig(*adminCfg, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return err
	}
	middleware.SuppressK8sRESTWarnings(restCfg)
	dyn, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return err
	}
	obj, err := dyn.Resource(APGVR).Namespace(ns).Get(ctx, apName, metav1.GetOptions{})
	if err != nil {
		return err
	}
	if obj.GetLabels()[ProjectUIDLabel] != projectUID {
		return fmt.Errorf("%w: AP not in shared project", ErrShareTokenInvalid)
	}
	return nil
}

// ShareK8sKindAllowed is true for kinds that may be listed with a project share token (read-only preview).
func ShareK8sKindAllowed(kind string) bool {
	k := strings.ToLower(strings.TrimSpace(kind))
	return k == "aps" || k == "ap"
}
