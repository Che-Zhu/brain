package k8s

import (
	"context"
	"fmt"
	"sort"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const APWorkloadEventLimitDefault = 50

type APWorkloadEventsOptions struct {
	Limit     int
	Name      string
	Namespace string
}

type WorkloadEventInvolvedObject struct {
	Kind string `json:"kind,omitempty"`
	Name string `json:"name,omitempty"`
}

type WorkloadEvent struct {
	Count          int                         `json:"count,omitempty"`
	FirstTimestamp string                      `json:"firstTimestamp,omitempty"`
	InvolvedObject WorkloadEventInvolvedObject `json:"involvedObject"`
	LastTimestamp  string                      `json:"lastTimestamp,omitempty"`
	Message        string                      `json:"message"`
	Reason         string                      `json:"reason"`
	Type           string                      `json:"type,omitempty"`
}

type APWorkloadEventsResult struct {
	Items  []WorkloadEvent `json:"items"`
	Target struct {
		Kind      string `json:"kind"`
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
	} `json:"target"`
}

func APWorkloadEvents(restConfig *rest.Config, opts APWorkloadEventsOptions) (APWorkloadEventsResult, error) {
	result := APWorkloadEventsResult{}
	result.Target.Kind = "AP"
	result.Target.Name = strings.TrimSpace(opts.Name)
	result.Target.Namespace = strings.TrimSpace(opts.Namespace)
	if result.Target.Name == "" || result.Target.Namespace == "" {
		return result, fmt.Errorf("AP workload name and namespace are required")
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return result, err
	}
	ctx := context.Background()

	refs := map[string]WorkloadEventInvolvedObject{}
	addRef := func(kind, name string) {
		kind = strings.TrimSpace(kind)
		name = strings.TrimSpace(name)
		if kind == "" || name == "" {
			return
		}
		refs[kind+"/"+name] = WorkloadEventInvolvedObject{Kind: kind, Name: name}
	}

	addRef("AP", result.Target.Name)
	addRef("Deployment", result.Target.Name)
	addRef("StatefulSet", result.Target.Name)

	if deployment, err := clientset.AppsV1().Deployments(result.Target.Namespace).Get(ctx, result.Target.Name, metav1.GetOptions{}); err == nil {
		for _, rs := range replicaSetsOwnedByDeployment(ctx, clientset, result.Target.Namespace, deployment) {
			addRef("ReplicaSet", rs.Name)
		}
	}
	if statefulSet, err := clientset.AppsV1().StatefulSets(result.Target.Namespace).Get(ctx, result.Target.Name, metav1.GetOptions{}); err == nil {
		addRef("StatefulSet", statefulSet.Name)
	}

	pods, err := clientset.CoreV1().Pods(result.Target.Namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app=" + result.Target.Name,
	})
	if err != nil {
		return result, err
	}
	for _, pod := range pods.Items {
		addRef("Pod", pod.Name)
	}

	events, err := clientset.CoreV1().Events(result.Target.Namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return result, err
	}

	items := make([]WorkloadEvent, 0)
	for _, event := range events.Items {
		ref := WorkloadEventInvolvedObject{
			Kind: event.InvolvedObject.Kind,
			Name: event.InvolvedObject.Name,
		}
		if _, ok := refs[ref.Kind+"/"+ref.Name]; !ok {
			continue
		}
		items = append(items, workloadEventFromCoreEvent(event, ref))
	}

	sort.SliceStable(items, func(i, j int) bool {
		return eventSortTimestamp(items[i]) > eventSortTimestamp(items[j])
	})
	limit := opts.Limit
	if limit <= 0 {
		limit = APWorkloadEventLimitDefault
	}
	if len(items) > limit {
		items = items[:limit]
	}
	result.Items = items
	return result, nil
}

func replicaSetsOwnedByDeployment(ctx context.Context, clientset *kubernetes.Clientset, namespace string, deployment *appsv1.Deployment) []appsv1.ReplicaSet {
	if deployment == nil {
		return nil
	}
	selector := metav1.FormatLabelSelector(deployment.Spec.Selector)
	if selector == "" {
		return nil
	}
	replicaSets, err := clientset.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return nil
	}
	owned := make([]appsv1.ReplicaSet, 0, len(replicaSets.Items))
	for _, rs := range replicaSets.Items {
		for _, owner := range rs.OwnerReferences {
			if owner.Kind == "Deployment" && owner.Name == deployment.Name {
				owned = append(owned, rs)
				break
			}
		}
	}
	return owned
}

func workloadEventFromCoreEvent(event corev1.Event, ref WorkloadEventInvolvedObject) WorkloadEvent {
	return WorkloadEvent{
		Count:          int(event.Count),
		FirstTimestamp: eventTimeString(event.FirstTimestamp, event.EventTime),
		InvolvedObject: ref,
		LastTimestamp:  eventTimeString(event.LastTimestamp, event.EventTime),
		Message:        event.Message,
		Reason:         event.Reason,
		Type:           event.Type,
	}
}

func eventTimeString(timestamp metav1.Time, microTimestamp metav1.MicroTime) string {
	if !timestamp.IsZero() {
		return timestamp.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	if !microTimestamp.IsZero() {
		return microTimestamp.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	return ""
}

func eventSortTimestamp(event WorkloadEvent) string {
	if event.LastTimestamp != "" {
		return event.LastTimestamp
	}
	return event.FirstTimestamp
}
