package metrics

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"sealos/api/middleware"
	"sealos/api/route/health"
	metricssvc "sealos/api/service/metrics"
)

// Register registers metrics endpoints on the given group (e.g. under /api/telemetry/v1alpha1).
func Register(grp huma.API) {
	registerHealth(grp)
	registerQuery(grp)
}

func registerHealth(grp huma.API) {
	huma.Register(grp, huma.Operation{
		OperationID:  "metrics-health",
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
	middleware.AuthInput
	Namespace string `query:"namespace" required:"true" doc:"Kubernetes namespace"`
	Name      string `query:"name" required:"true" doc:"Resource name"`
	Kind      string `query:"kind" required:"true" doc:"Metric source kind: db or ap"`
}

type queryOutput struct {
	Body []map[string]interface{}
}

func registerQuery(grp huma.API) {
	huma.Register(grp, huma.Operation{
		OperationID:  "metrics-query",
		Method:      http.MethodGet,
		Path:        "/metrics",
		Summary:     "Query metrics (flattened time series)",
		Description: "Range query metrics from VictoriaMetrics for kind=db or kind=ap, then flatten into a single time series combining all metrics. Default range is last 6h with 5m step.",
		Tags:        []string{"Metrics"},
	}, func(ctx context.Context, input *queryInput) (*queryOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
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

		ns := resolved.Namespace

		data, err := metricssvc.RangeMetrics(ctx, input.Authorization, input.Kind, ns, input.Name)
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
