package db

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"

	dbsvc "sealos/api/service/db"
)

func TestRegisterIncludesAccessHealthRoute(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	path := api.OpenAPI().Paths["/api/db/v1alpha1/{name}/access/health"]
	if path == nil || path.Post == nil {
		t.Fatalf("expected POST /api/db/v1alpha1/{name}/access/health to be registered")
	}
	if path.Post.OperationID != "db-access-health" {
		t.Fatalf("unexpected operation ID: %q", path.Post.OperationID)
	}
}

func TestRegisterIncludesAccessObjectsRoute(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	path := api.OpenAPI().Paths["/api/db/v1alpha1/{name}/access/objects"]
	if path == nil || path.Post == nil {
		t.Fatalf("expected POST /api/db/v1alpha1/{name}/access/objects to be registered")
	}
	if path.Post.OperationID != "db-access-objects" {
		t.Fatalf("unexpected operation ID: %q", path.Post.OperationID)
	}
}

func TestAccessHealthErrorStatusMapping(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{name: "request validation", err: dbsvc.ErrAccessHealthProjectUID, want: http.StatusBadRequest},
		{name: "ownership mismatch", err: dbsvc.ErrAccessHealthProjectForbidden, want: http.StatusForbidden},
		{name: "missing ownership metadata", err: dbsvc.ErrAccessHealthProjectMissing, want: http.StatusConflict},
		{name: "not ready", err: dbsvc.ErrAccessHealthDBNotReady, want: http.StatusConflict},
		{name: "missing secret", err: dbsvc.ErrAccessHealthSecretMissing, want: http.StatusConflict},
		{name: "unsupported engine", err: dbsvc.ErrAccessHealthUnsupported, want: http.StatusUnprocessableEntity},
		{name: "missing whodb config", err: dbsvc.ErrAccessHealthWhoDBMissing, want: http.StatusServiceUnavailable},
		{name: "unavailable whodb", err: fmt.Errorf("%w: refused", dbsvc.ErrAccessHealthWhoDBUnavailable), want: http.StatusServiceUnavailable},
		{name: "timeout", err: fmt.Errorf("%w: deadline", dbsvc.ErrAccessHealthWhoDBTimeout), want: http.StatusGatewayTimeout},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := accessHealthError(tt.err)
			statusErr, ok := err.(huma.StatusError)
			if !ok {
				t.Fatalf("expected Huma status error, got %T", err)
			}
			if statusErr.GetStatus() != tt.want {
				t.Fatalf("expected status %d, got %d", tt.want, statusErr.GetStatus())
			}
		})
	}
}

func TestAccessObjectsErrorStatusMapping(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{name: "invalid ref", err: dbsvc.ErrAccessObjectsInvalidRef, want: http.StatusUnprocessableEntity},
		{name: "unsupported kind", err: dbsvc.ErrAccessObjectsUnsupportedKind, want: http.StatusUnprocessableEntity},
		{name: "unsupported engine", err: dbsvc.ErrAccessHealthUnsupported, want: http.StatusUnprocessableEntity},
		{name: "missing whodb config", err: dbsvc.ErrAccessHealthWhoDBMissing, want: http.StatusServiceUnavailable},
		{name: "timeout", err: fmt.Errorf("%w: deadline", dbsvc.ErrAccessHealthWhoDBTimeout), want: http.StatusGatewayTimeout},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := accessObjectsError(tt.err)
			statusErr, ok := err.(huma.StatusError)
			if !ok {
				t.Fatalf("expected Huma status error, got %T", err)
			}
			if statusErr.GetStatus() != tt.want {
				t.Fatalf("expected status %d, got %d", tt.want, statusErr.GetStatus())
			}
		})
	}
}
