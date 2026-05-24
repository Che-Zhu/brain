package ap

import (
	"strings"
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
)

func TestAPMutationOpenAPIDocsDescribeReplicaStrategyAsCanonicalDesiredState(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	path := api.OpenAPI().Paths["/api/ap/v1alpha1/"]
	if path == nil || path.Put == nil || path.Patch == nil {
		t.Fatal("expected AP create and update routes to be registered")
	}

	descriptions := map[string]string{
		"create": path.Put.Description,
		"update": path.Patch.Description,
	}
	for name, description := range descriptions {
		t.Run(name, func(t *testing.T) {
			for _, want := range []string{
				"`spec.resource.replicaStrategy` is the canonical AP Replica Strategy model for new AP Settings writes.",
				"Fixed Replicas",
				"Elastic Scaling",
				"Legacy `spec.resource.replicas` remains accepted as a Fixed Replicas fallback only when `spec.resource.replicaStrategy` is absent.",
				"AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API.",
			} {
				if !strings.Contains(description, want) {
					t.Fatalf("expected %s docs to contain %q, got: %s", name, want, description)
				}
			}
		})
	}
}
