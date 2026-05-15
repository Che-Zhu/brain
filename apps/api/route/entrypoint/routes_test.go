package entrypoint

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"

	k8ssvc "sealos/api/service/k8s"
)

func TestRegisterIncludesEntryPointListRoute(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	path := api.OpenAPI().Paths["/api/entrypoint/v1alpha1/"]
	if path == nil || path.Get == nil {
		t.Fatalf("expected GET /api/entrypoint/v1alpha1/ to be registered")
	}
	if path.Get.OperationID != "entrypoint-get" {
		t.Fatalf("unexpected operation ID: %q", path.Get.OperationID)
	}
}

func TestEntryPointMissingResourceFallbackReturnsEmptyList(t *testing.T) {
	body, ok := emptyListForMissingEntryPointResource(fmt.Errorf(
		"resolve resource: %w",
		k8ssvc.UnknownResourceError{Resource: "entrypoints"},
	))
	if !ok {
		t.Fatal("expected missing entrypoints resource error to use fallback")
	}

	var list struct {
		APIVersion string            `json:"apiVersion"`
		Kind       string            `json:"kind"`
		Items      []json.RawMessage `json:"items"`
	}
	if err := json.Unmarshal(body, &list); err != nil {
		t.Fatalf("fallback body is not valid JSON: %v", err)
	}
	if list.APIVersion != "example.crossplane.io/v1alpha1" {
		t.Fatalf("apiVersion = %q, want example.crossplane.io/v1alpha1", list.APIVersion)
	}
	if list.Kind != "EntryPointList" {
		t.Fatalf("kind = %q, want EntryPointList", list.Kind)
	}
	if len(list.Items) != 0 {
		t.Fatalf("items length = %d, want 0", len(list.Items))
	}
}

func TestEntryPointMissingResourceFallbackIgnoresOtherErrors(t *testing.T) {
	if _, ok := emptyListForMissingEntryPointResource(fmt.Errorf("boom")); ok {
		t.Fatal("did not expect generic errors to use EntryPoint empty-list fallback")
	}
}
