package db

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

var accessHealthDBGVR = schema.GroupVersionResource{
	Group:    "example.crossplane.io",
	Version:  "v1",
	Resource: "dbs",
}

type KubernetesAccessHealthStore struct {
	dynamic dynamic.Interface
	core    kubernetes.Interface
}

func NewKubernetesAccessHealthStore(restConfig *rest.Config) (*KubernetesAccessHealthStore, error) {
	dyn, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}
	core, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}
	return &KubernetesAccessHealthStore{dynamic: dyn, core: core}, nil
}

func (s *KubernetesAccessHealthStore) GetDB(ctx context.Context, namespace, name string) (*unstructured.Unstructured, error) {
	obj, err := s.dynamic.Resource(accessHealthDBGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, ErrAccessHealthDBNotFound
		}
		return nil, err
	}
	return obj, nil
}

func (s *KubernetesAccessHealthStore) GetSecret(ctx context.Context, namespace, name string) (*corev1.Secret, error) {
	secret, err := s.core.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, ErrAccessHealthSecretMissing
		}
		return nil, err
	}
	return secret, nil
}
