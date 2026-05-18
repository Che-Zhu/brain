package metrics

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"

	"sealos/api/middleware"
	"sealos/api/route/health"
	metricssvc "sealos/api/service/metrics"
	projectsvc "sealos/api/service/project"
	workloadtelemetry "sealos/api/service/workloadtelemetry"
)

// Register registers metrics endpoints on the given group (e.g. under /api/telemetry/v1alpha1).
func Register(grp huma.API) {
	registerHealth(grp)
	registerQuery(grp)
	registerSnapshot(grp)
}

func registerHealth(grp huma.API) {
	huma.Register(grp, huma.Operation{
		OperationID: "metrics-health",
		Method:      http.MethodGet,
		Path:        "/metrics/health",
		Summary:     "Metrics health",
		Description: "Health check for metrics endpoints.",
		Tags:        []string{"Metrics"},
	}, func(ctx context.Context, input *struct{}) (*health.Output, error) {
		resp := &health.Output{}
		resp.Body.Status = "ok"
		return resp, nil
	})
}

type queryInput struct {
	Authorization string `header:"Authorization" doc:"Bearer url-encoded kubeconfig (omit when using share token)"`
	ShareToken    string `header:"X-Share-Token" doc:"Project share JWT; uses ENCODED_ADMIN_KUBECONFIG; kind must be ap"`
	ShareTokenQP  string `query:"shareToken" doc:"Same as X-Share-Token"`
	Namespace     string `query:"namespace" required:"true" doc:"Kubernetes namespace"`
	Name          string `query:"name" required:"true" doc:"Resource name"`
	Kind          string `query:"kind" required:"true" doc:"Metric source kind: db or ap"`
}

type queryOutput struct {
	Body []map[string]interface{}
}

type snapshotBody struct {
	Targets []workloadtelemetry.Target `json:"targets" required:"true" minItems:"1" doc:"Workload targets to snapshot"`
}

type snapshotInput struct {
	Authorization string       `header:"Authorization" required:"true" doc:"Bearer url-encoded kubeconfig"`
	Body          snapshotBody `doc:"Snapshot batch request"`
}

type snapshotOutput struct {
	Body workloadtelemetry.SnapshotResponse
}

func registerSnapshot(grp huma.API) {
	huma.Register(grp, huma.Operation{
		OperationID: "metrics-snapshot",
		Method:      http.MethodPost,
		Path:        "/metrics/snapshot",
		Summary:     "Snapshot workload metrics",
		Description: "Batch latest AP and DB workload telemetry snapshots for canvas footer metrics.",
		Tags:        []string{"Metrics"},
	}, func(ctx context.Context, input *snapshotInput) (*snapshotOutput, error) {
		authz := strings.TrimSpace(input.Authorization)
		if authz == "" {
			return nil, huma.Error400BadRequest("Authorization is required", nil)
		}
		cfg, err := middleware.ConfigFromAuth(authz)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		podsGVR := middleware.PodsGVR()
		for _, ns := range snapshotNamespaces(input.Body.Targets) {
			if _, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
				Namespace:        ns,
				AllNamespaces:    false,
				DefaultNamespace: "",
				AdminCheckGVR:    &podsGVR,
			}); err != nil {
				return nil, huma.Error500InternalServerError("failed to resolve request context", err)
			}
		}

		service, err := workloadtelemetry.NewDefaultService()
		if err != nil {
			return nil, snapshotServiceError(err)
		}
		data, err := service.Snapshot(ctx, authz, input.Body.Targets)
		if err != nil {
			return nil, snapshotServiceError(err)
		}
		return &snapshotOutput{Body: data}, nil
	})
}

func snapshotNamespaces(targets []workloadtelemetry.Target) []string {
	seen := make(map[string]struct{}, len(targets))
	out := make([]string, 0, len(targets))
	for _, target := range targets {
		ns := strings.TrimSpace(target.Namespace)
		if ns == "" {
			continue
		}
		if _, ok := seen[ns]; ok {
			continue
		}
		seen[ns] = struct{}{}
		out = append(out, ns)
	}
	return out
}

func snapshotServiceError(err error) error {
	switch {
	case errors.Is(err, workloadtelemetry.ErrEmptyTargets):
		return huma.Error400BadRequest("snapshot targets are required", err)
	case errors.Is(err, workloadtelemetry.ErrNoVictoriaMetricsURL):
		return huma.Error500InternalServerError("VMSELECT_URL is not configured", err)
	default:
		return huma.Error500InternalServerError("failed to snapshot workload telemetry", err)
	}
}

func registerQuery(grp huma.API) {
	huma.Register(grp, huma.Operation{
		OperationID: "metrics-query",
		Method:      http.MethodGet,
		Path:        "/metrics",
		Summary:     "Query metrics (flattened time series)",
		Description: "Range query metrics from VictoriaMetrics for kind=db or kind=ap, then flatten into a single time series combining all metrics. Default range is last 6h with 5m step.",
		Tags:        []string{"Metrics"},
	}, func(ctx context.Context, input *queryInput) (*queryOutput, error) {
		shareTok := strings.TrimSpace(input.ShareToken)
		if shareTok == "" {
			shareTok = strings.TrimSpace(input.ShareTokenQP)
		}
		authz := strings.TrimSpace(input.Authorization)

		var authHeader string
		ns := input.Namespace

		if shareTok != "" {
			if authz != "" {
				return nil, huma.Error400BadRequest("send either Authorization or share token, not both", nil)
			}
			if strings.ToLower(strings.TrimSpace(input.Kind)) != "ap" {
				return nil, huma.Error403Forbidden("share token metrics only support kind=ap", nil)
			}
			adminCfg, err := middleware.AdminKubeconfigFromEnv()
			if err != nil {
				return nil, huma.Error500InternalServerError("admin kubeconfig not configured", err)
			}
			validated, err := projectsvc.ValidateShareAccess(ctx, adminCfg, shareTok)
			if err != nil {
				switch {
				case errors.Is(err, projectsvc.ErrShareProjectNotPublic):
					return nil, huma.Error403Forbidden("project is not shared publicly", err)
				case errors.Is(err, projectsvc.ErrShareForbidden):
					return nil, huma.Error403Forbidden("share permission not allowed", err)
				case errors.Is(err, projectsvc.ErrShareTokenInvalid):
					return nil, huma.Error401Unauthorized("invalid share token", err)
				default:
					return nil, huma.Error401Unauthorized("share token validation failed", err)
				}
			}
			if validated.Claims.Namespace != input.Namespace {
				return nil, huma.Error403Forbidden("namespace does not match share token", nil)
			}
			if err := projectsvc.VerifyAPInShareProject(ctx, adminCfg, input.Namespace, input.Name, validated.ProjectUID); err != nil {
				return nil, huma.Error403Forbidden("AP not part of shared project", err)
			}
			bearer, berr := middleware.AdminAuthorizationBearer()
			if berr != nil {
				return nil, huma.Error500InternalServerError("admin authorization not available", berr)
			}
			authHeader = bearer
		} else {
			if authz == "" {
				return nil, huma.Error400BadRequest("Authorization or share token is required", nil)
			}
			cfg, err := middleware.ConfigFromAuth(authz)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid kubeconfig", err)
			}
			gvr := middleware.PodsGVR()
			resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
				Namespace:        input.Namespace,
				AllNamespaces:    false,
				DefaultNamespace: "",
				AdminCheckGVR:    &gvr,
			})
			if err != nil {
				return nil, huma.Error500InternalServerError("failed to resolve request context", err)
			}
			ns = resolved.Namespace
			authHeader = authz
		}

		data, err := metricssvc.RangeMetrics(ctx, authHeader, input.Kind, ns, input.Name)
		if err != nil {
			switch {
			case errors.Is(err, metricssvc.ErrInvalidKind):
				return nil, huma.Error400BadRequest("kind must be db or ap", err)
			case errors.Is(err, metricssvc.ErrNoVMHost):
				return nil, huma.Error500InternalServerError("VMSELECT_URL is not configured", err)
			case errors.Is(err, metricssvc.ErrClusterNotFound):
				return nil, huma.Error404NotFound("cluster not found", err)
			case errors.Is(err, metricssvc.ErrUnsupportedDef):
				return nil, huma.Error400BadRequest("unsupported cluster definition", err)
			case errors.Is(err, metricssvc.ErrUncompleteParam):
				return nil, huma.Error400BadRequest("missing namespace or name", err)
			default:
				return nil, huma.Error500InternalServerError("failed to query VictoriaMetrics", err)
			}
		}

		flat, err := metricssvc.FlattenMetricsResponse(data)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to transform metrics response", err)
		}
		return &queryOutput{Body: flat}, nil
	})
}
