package ap

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"sealos/api/middleware"
	k8ssvc "sealos/api/service/k8s"
)

func registerGet(grp huma.API) {
	type getInput struct {
		middleware.AuthInput
		Name      string `query:"name" doc:"AP instance name (omit to list all in namespace)"`
		Namespace string `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
	}
	type getOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID:  "ap-get",
		Method:      http.MethodGet,
		Path:        "/",
		Summary:     "Get AP(s)",
		Description: "Get a single AP by name or list APs in the namespace.\n\nParameter usage:\n- `name` is optional. If omitted, the endpoint lists all APs in the resolved namespace.\n- `namespace` is optional. It uses the kubeconfig namespace by default; admins can override it.\n\nWhat the AP represents:\n- AP is the Crossplane composite resource (`example.crossplane.io/v1`, kind `AP`) that composes the Deployment, Service(s), and Ingress shown in the composition.\n- The AP spec may include `spec.probes` (startup, liveness, readiness) for health checks; each probe supports httpGet, tcpSocket, exec, or grpc.\n\nResponse enrichment:\n- `status.variables`: external ingress URLs per port when a real host is available (internal-only cluster DNS is omitted when there is no external URL; default composition placeholder hosts are ignored).\n- `status.backups`: concise summaries of orphaned config snapshots (ConfigMap name, image, createdAt), excluding the managed backup. Ordered newest first.",
		Tags:        []string{"AP"},
	}, func(ctx context.Context, input *getInput) (*getOutput, error) {
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

		jsonBytes, err := k8ssvc.Get(cfg, k8ssvc.GetOptions{
			Resource:  "aps",
			Name:      input.Name,
			Namespace: resolved.Namespace,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get AP(s)", err)
		}
		return &getOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}
