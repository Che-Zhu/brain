package metrics

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	projectsvc "sealos/api/service/project"
	workloadtelemetry "sealos/api/service/workloadtelemetry"
)

func TestRegisterIncludesSnapshotRoute(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	path := api.OpenAPI().Paths["/metrics/snapshot"]
	if path == nil || path.Post == nil {
		t.Fatalf("expected POST /metrics/snapshot to be registered")
	}
	if path.Post.OperationID != "metrics-snapshot" {
		t.Fatalf("unexpected operation ID: %q", path.Post.OperationID)
	}
}

func TestRegisterIncludesSeriesRoute(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	path := api.OpenAPI().Paths["/metrics/series"]
	if path == nil || path.Post == nil {
		t.Fatalf("expected POST /metrics/series to be registered")
	}
	if path.Post.OperationID != "metrics-series" {
		t.Fatalf("unexpected operation ID: %q", path.Post.OperationID)
	}
}

func TestRegisterOmitsLegacySingleResourceMetricsRoute(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))

	Register(api)

	if path := api.OpenAPI().Paths["/metrics"]; path != nil {
		t.Fatalf("expected legacy GET /metrics route to be removed, got %#v", path)
	}
}

func TestMetricsHealthReportsVictoriaMetricsConfiguration(t *testing.T) {
	tests := []struct {
		name  string
		vmURL string
		want  string
	}{
		{name: "missing", vmURL: "", want: "degraded"},
		{name: "configured", vmURL: "http://vmselect.monitoring:8481", want: "configured"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("VMSELECT_URL", tt.vmURL)

			router := chi.NewRouter()
			api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))
			Register(api)

			req := httptest.NewRequest(http.MethodGet, "/metrics/health", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("expected health status 200, got %d: %s", w.Code, w.Body.String())
			}
			var body struct {
				Status string `json:"status"`
			}
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode health response: %v", err)
			}
			if body.Status != tt.want {
				t.Fatalf("status = %q, want %q", body.Status, tt.want)
			}
		})
	}
}

func TestSnapshotRejectsRangeControlsAtHTTPBoundary(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))
	Register(api)

	body := []byte(`{
		"targets": [{"kind": "ap", "namespace": "project-a", "name": "web"}],
		"start": "2026-05-18T00:00:00Z"
	}`)
	req := httptest.NewRequest(http.MethodPost, "/metrics/snapshot", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer not-a-kubeconfig")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected range field to be rejected before auth, got %d: %s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("unexpected property")) || !bytes.Contains(w.Body.Bytes(), []byte("body.start")) {
		t.Fatalf("expected body.start schema rejection, got: %s", w.Body.String())
	}
}

func TestSnapshotWithShareTokenRejectsDBTargets(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))
	Register(api)

	body := []byte(`{
		"targets": [{"kind": "db", "namespace": "project-a", "name": "pg"}]
	}`)
	req := httptest.NewRequest(http.MethodPost, "/metrics/snapshot", bytes.NewReader(body))
	req.Header.Set("X-Share-Token", "share-token")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected share-token DB snapshot to be forbidden, got %d: %s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("only support kind=ap")) {
		t.Fatalf("expected AP-only error, got: %s", w.Body.String())
	}
}

func TestSnapshotWithShareTokenValidatesShareBoundaryAndReturnsAPTelemetry(t *testing.T) {
	restoreMetricsRouteDeps(t)

	var (
		gotAuth       string
		gotTargets    []workloadtelemetry.Target
		validatedWith string
		verifiedAPs   []string
	)

	newWorkloadTelemetryService = func() (workloadTelemetryService, error) {
		return fakeWorkloadTelemetryService{
			snapshot: func(_ context.Context, auth string, targets []workloadtelemetry.Target) (workloadtelemetry.SnapshotResponse, error) {
				gotAuth = auth
				gotTargets = targets
				return workloadtelemetry.SnapshotResponse{Items: []workloadtelemetry.SnapshotItem{
					{
						Metrics: map[workloadtelemetry.MetricKey]workloadtelemetry.MetricSample{
							workloadtelemetry.MetricCPU:    {Value: 17.5},
							workloadtelemetry.MetricMemory: {Value: 61},
						},
						SampledAt: time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC),
						Target:    targets[0],
					},
				}}, nil
			},
		}, nil
	}
	adminKubeconfigFromEnv = func() (*clientcmdapi.Config, error) {
		return &clientcmdapi.Config{}, nil
	}
	validateShareAccess = func(_ context.Context, _ *clientcmdapi.Config, rawToken string) (*projectsvc.ValidatedShare, error) {
		validatedWith = rawToken
		return &projectsvc.ValidatedShare{
			Claims:     &projectsvc.ShareClaims{Namespace: "project-a"},
			ProjectUID: "project-uid-1",
		}, nil
	}
	verifyAPInShareProject = func(_ context.Context, _ *clientcmdapi.Config, ns, apName, projectUID string) error {
		verifiedAPs = append(verifiedAPs, ns+"/"+apName+"@"+projectUID)
		return nil
	}
	adminAuthorizationBearer = func() (string, error) {
		return "Bearer admin-kubeconfig", nil
	}

	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))
	Register(api)

	body := []byte(`{
		"targets": [{"kind": "ap", "namespace": "project-a", "name": "web"}]
	}`)
	req := httptest.NewRequest(http.MethodPost, "/metrics/snapshot", bytes.NewReader(body))
	req.Header.Set("X-Share-Token", "share-token")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected share-token AP snapshot to succeed, got %d: %s", w.Code, w.Body.String())
	}
	if validatedWith != "share-token" {
		t.Fatalf("share token validated with %q", validatedWith)
	}
	if gotAuth != "Bearer admin-kubeconfig" {
		t.Fatalf("snapshot auth = %q, want admin bearer", gotAuth)
	}
	if len(gotTargets) != 1 || gotTargets[0].Kind != workloadtelemetry.WorkloadKindAP || gotTargets[0].Name != "web" {
		t.Fatalf("snapshot targets = %#v", gotTargets)
	}
	if len(verifiedAPs) != 1 || verifiedAPs[0] != "project-a/web@project-uid-1" {
		t.Fatalf("verified APs = %#v", verifiedAPs)
	}

	var response workloadtelemetry.SnapshotResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode snapshot response: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].Metrics[workloadtelemetry.MetricCPU].Value != 17.5 {
		t.Fatalf("unexpected snapshot response: %#v", response)
	}
}

func TestSnapshotWithShareTokenRejectsNamespaceMismatchBeforeAPMembershipCheck(t *testing.T) {
	restoreMetricsRouteDeps(t)

	verifyCalled := false
	snapshotCalled := false
	newWorkloadTelemetryService = func() (workloadTelemetryService, error) {
		return fakeWorkloadTelemetryService{
			snapshot: func(context.Context, string, []workloadtelemetry.Target) (workloadtelemetry.SnapshotResponse, error) {
				snapshotCalled = true
				return workloadtelemetry.SnapshotResponse{}, nil
			},
		}, nil
	}
	adminKubeconfigFromEnv = func() (*clientcmdapi.Config, error) {
		return &clientcmdapi.Config{}, nil
	}
	validateShareAccess = func(context.Context, *clientcmdapi.Config, string) (*projectsvc.ValidatedShare, error) {
		return &projectsvc.ValidatedShare{
			Claims:     &projectsvc.ShareClaims{Namespace: "project-a"},
			ProjectUID: "project-uid-1",
		}, nil
	}
	verifyAPInShareProject = func(context.Context, *clientcmdapi.Config, string, string, string) error {
		verifyCalled = true
		return nil
	}
	adminAuthorizationBearer = func() (string, error) {
		return "Bearer admin-kubeconfig", nil
	}

	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))
	Register(api)

	body := []byte(`{
		"targets": [{"kind": "ap", "namespace": "project-b", "name": "web"}]
	}`)
	req := httptest.NewRequest(http.MethodPost, "/metrics/snapshot", bytes.NewReader(body))
	req.Header.Set("X-Share-Token", "share-token")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected namespace mismatch to be forbidden, got %d: %s", w.Code, w.Body.String())
	}
	if verifyCalled {
		t.Fatal("AP membership check should not run after namespace mismatch")
	}
	if snapshotCalled {
		t.Fatal("snapshot service should not run after namespace mismatch")
	}
}

func TestSeriesRejectsBatchTargetsAtHTTPBoundary(t *testing.T) {
	router := chi.NewRouter()
	api := humachi.New(router, huma.DefaultConfig("test", "0.0.0"))
	Register(api)

	body := []byte(`{
		"targets": [{"kind": "ap", "namespace": "project-a", "name": "web"}],
		"start": "2026-05-18T00:00:00Z",
		"end": "2026-05-18T01:00:00Z",
		"step": "60s"
	}`)
	req := httptest.NewRequest(http.MethodPost, "/metrics/series", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer not-a-kubeconfig")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected batch targets to be rejected before auth, got %d: %s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("unexpected property")) || !bytes.Contains(w.Body.Bytes(), []byte("body.targets")) {
		t.Fatalf("expected body.targets schema rejection, got: %s", w.Body.String())
	}
}

func restoreMetricsRouteDeps(t *testing.T) {
	t.Helper()
	oldNewService := newWorkloadTelemetryService
	oldAdminKubeconfig := adminKubeconfigFromEnv
	oldValidateShare := validateShareAccess
	oldVerifyAP := verifyAPInShareProject
	oldAdminBearer := adminAuthorizationBearer
	t.Cleanup(func() {
		newWorkloadTelemetryService = oldNewService
		adminKubeconfigFromEnv = oldAdminKubeconfig
		validateShareAccess = oldValidateShare
		verifyAPInShareProject = oldVerifyAP
		adminAuthorizationBearer = oldAdminBearer
	})
}

type fakeWorkloadTelemetryService struct {
	snapshot func(context.Context, string, []workloadtelemetry.Target) (workloadtelemetry.SnapshotResponse, error)
}

func (f fakeWorkloadTelemetryService) Snapshot(ctx context.Context, auth string, targets []workloadtelemetry.Target) (workloadtelemetry.SnapshotResponse, error) {
	if f.snapshot == nil {
		return workloadtelemetry.SnapshotResponse{}, nil
	}
	return f.snapshot(ctx, auth, targets)
}

func (f fakeWorkloadTelemetryService) Series(context.Context, string, workloadtelemetry.SeriesRequest) (workloadtelemetry.SeriesResponse, error) {
	return workloadtelemetry.SeriesResponse{}, nil
}
