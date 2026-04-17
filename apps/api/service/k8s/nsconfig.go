package k8s

import (
	"context"
	"fmt"
	"os"
	"strings"

	authv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// Permission is the access level for the namespace-scoped kubeconfig.
const (
	PermissionFull = "full" // full access in namespace
	PermissionEdit = "edit" // bind to built-in edit ClusterRole
)

// AdminKubeconfigForNamespace creates a namespace-scoped kubeconfig using admin config.
// Requires admin kubeconfig. Returns a new kubeconfig with a ServiceAccount token for the target namespace.
func AdminKubeconfigForNamespace(adminConfig *rest.Config, namespace, permission string) (*clientcmdapi.Config, error) {
	namespace = strings.TrimSpace(namespace)
	if namespace == "" {
		return nil, fmt.Errorf("namespace is required")
	}
	permission = strings.ToLower(strings.TrimSpace(permission))
	if permission == "" {
		permission = PermissionFull
	}
	if permission != PermissionFull && permission != PermissionEdit {
		return nil, fmt.Errorf("permission must be %q or %q", PermissionFull, PermissionEdit)
	}

	clientset, err := kubernetes.NewForConfig(adminConfig)
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	saName := namespace + "-user"

	// 1. Create namespace if not exists
	_, err = clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			_, err = clientset.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{Name: namespace},
			}, metav1.CreateOptions{})
			if err != nil {
				return nil, fmt.Errorf("create namespace: %w", err)
			}
		} else {
			return nil, fmt.Errorf("get namespace: %w", err)
		}
	}

	// 2. Create ServiceAccount (idempotent)
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{Name: saName},
	}
	_, err = clientset.CoreV1().ServiceAccounts(namespace).Create(ctx, sa, metav1.CreateOptions{})
	if err != nil && !apierrors.IsAlreadyExists(err) {
		return nil, fmt.Errorf("create serviceaccount: %w", err)
	}

	// 3. Grant permissions
	if permission == PermissionEdit {
		rb := &rbacv1.RoleBinding{
			ObjectMeta: metav1.ObjectMeta{Name: saName + "-edit"},
			Subjects: []rbacv1.Subject{
				{Kind: "ServiceAccount", Name: saName, Namespace: namespace},
			},
			RoleRef: rbacv1.RoleRef{
				APIGroup: "rbac.authorization.k8s.io",
				Kind:     "ClusterRole",
				Name:     "edit",
			},
		}
		_, err = clientset.RbacV1().RoleBindings(namespace).Create(ctx, rb, metav1.CreateOptions{})
		if err != nil && !apierrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("create rolebinding: %w", err)
		}
	} else {
		role := &rbacv1.Role{
			ObjectMeta: metav1.ObjectMeta{Name: saName + "-full"},
			Rules: []rbacv1.PolicyRule{
				{APIGroups: []string{"*"}, Resources: []string{"*"}, Verbs: []string{"*"}},
			},
		}
		_, err = clientset.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{})
		if err != nil && !apierrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("create role: %w", err)
		}
		rb := &rbacv1.RoleBinding{
			ObjectMeta: metav1.ObjectMeta{Name: saName + "-full"},
			Subjects: []rbacv1.Subject{
				{Kind: "ServiceAccount", Name: saName, Namespace: namespace},
			},
			RoleRef: rbacv1.RoleRef{
				APIGroup: "rbac.authorization.k8s.io",
				Kind:     "Role",
				Name:     saName + "-full",
			},
		}
		_, err = clientset.RbacV1().RoleBindings(namespace).Create(ctx, rb, metav1.CreateOptions{})
		if err != nil && !apierrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("create rolebinding: %w", err)
		}
	}

	// 4. Create token (1 year)
	tokenReq := &authv1.TokenRequest{
		Spec: authv1.TokenRequestSpec{
			ExpirationSeconds: ptr(int64(8760 * 3600)), // 8760h
		},
	}
	tr, err := clientset.CoreV1().ServiceAccounts(namespace).CreateToken(ctx, saName, tokenReq, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("create token: %w", err)
	}

	// 5. Build kubeconfig from admin config cluster info + token
	server := adminConfig.Host
	if server == "" {
		return nil, fmt.Errorf("admin config has no host")
	}

	clusterName := "cluster"
	cluster := &clientcmdapi.Cluster{Server: server}
	if len(adminConfig.CAData) > 0 {
		cluster.CertificateAuthorityData = adminConfig.CAData
	} else if adminConfig.CAFile != "" {
		data, err := os.ReadFile(adminConfig.CAFile)
		if err != nil {
			return nil, fmt.Errorf("read CA file: %w", err)
		}
		cluster.CertificateAuthorityData = data
	} else if adminConfig.Insecure {
		cluster.InsecureSkipTLSVerify = true
	} else {
		return nil, fmt.Errorf("admin config must have CAData, CAFile, or use Insecure")
	}

	cfg := &clientcmdapi.Config{
		Clusters: map[string]*clientcmdapi.Cluster{
			clusterName: cluster,
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			saName: {
				Token: tr.Status.Token,
			},
		},
		Contexts: map[string]*clientcmdapi.Context{
			namespace: {
				Cluster:   clusterName,
				AuthInfo:  saName,
				Namespace: namespace,
			},
		},
		CurrentContext: namespace,
	}
	return cfg, nil
}

func ptr[T any](v T) *T { return &v }
