package workloadtelemetry

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"

	"sealos/api/middleware"
	metricssvc "sealos/api/service/metrics"
)

const clusterDefinitionLabel = "clusterdefinition.kubeblocks.io/name"

var kubeblocksClusterGVR = schema.GroupVersionResource{
	Group:    "apps.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "clusters",
}

type ClusterDBResolver struct{}

func (ClusterDBResolver) ResolveDBEngine(ctx context.Context, auth string, namespace string, name string) (DBEngine, error) {
	restConfig, _, err := middleware.RestConfigFromAuth(auth)
	if err != nil {
		return "", err
	}
	dyn, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return "", err
	}
	obj, err := dyn.Resource(kubeblocksClusterGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", ErrUnsupportedDBDefinition
	}

	labelValue := obj.GetLabels()[clusterDefinitionLabel]
	if labelValue == "" {
		return "", ErrUnsupportedDBDefinition
	}
	dbType, ok := metricssvc.DBTypeFromLabel(labelValue)
	if !ok {
		return "", ErrUnsupportedDBDefinition
	}
	return DBEngine(dbType), nil
}
