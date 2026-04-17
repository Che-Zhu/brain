package transform

import (
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// TransformListItemForGet returns apiVersion, kind, metadata.name, metadata.namespace, and metadata.labels for a list item.
// Used when listing resources via k8s get (no name specified).
func TransformListItemForGet(obj *unstructured.Unstructured) map[string]interface{} {
	if obj == nil {
		return nil
	}
	out := map[string]interface{}{}
	if v, ok := obj.Object["apiVersion"]; ok {
		out["apiVersion"] = v
	}
	if v, ok := obj.Object["kind"]; ok {
		out["kind"] = v
	}
	if meta, ok := obj.Object["metadata"].(map[string]interface{}); ok {
		filtered := map[string]interface{}{}
		if v, ok := meta["name"]; ok {
			filtered["name"] = v
		}
		if v, ok := meta["namespace"]; ok {
			filtered["namespace"] = v
		}
		if v, ok := meta["labels"]; ok {
			filtered["labels"] = v
		}
		out["metadata"] = filtered
	}
	return out
}
