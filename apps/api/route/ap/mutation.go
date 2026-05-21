package ap

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"

	"sealos/api/middleware"
	k8ssvc "sealos/api/service/k8s"
)

func registerCreate(grp huma.API) {
	type createBody struct {
		YAML string `json:"yaml" required:"true" doc:"AP manifest (YAML or JSON). Must be a single example.crossplane.io/v1, kind: AP resource.\n\nAP spec fields:\n- spec.name: logical instance name used by the Composition for resource naming; defaults to metadata.name if omitted.\n- spec.projectName: optional Project claim name in the same namespace (labels + ownerReference on composed resources).\n- spec.input.image: container image for the Deployment.\n- spec.input.network.privatePort: App Listening Port for the private-only Network path.\n- spec.input.endpoints: legacy/public array of {port, host?, public?}; each public entry creates Service + Ingress wiring.\n- spec.input.port / spec.input.host: legacy single-endpoint alternative when input.endpoints is omitted.\n- spec.input.env: environment variables (name + value or valueFrom).\n- spec.input.probes: health probes (startup, liveness, readiness).\n- spec.input.imagePullPolicy: image pull policy (default Always).\n- spec.resource.replicas: Deployment replica count (default 1).\n- spec.resource.requests / spec.resource.limits: container resources (cpu, memory).\n- spec.paused: scale to 0 with SealOS pause annotations when true.\n- spec.restartRequest: bump to roll pods via Composition.\n- spec.ingressAnnotations: extra Ingress annotations."`
	}
	type createInput struct {
		middleware.AuthInput
		Body createBody
	}
	type createOutput struct {
		Body struct {
			YAML string `json:"yaml" doc:"The created AP resource in YAML format (server state after apply)."`
		}
	}

	exampleYAML := `apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: my-app
spec:
  name: my-app
  input:
    image: nginx:1.27
    network:
      privatePort: 80
    probes:
      startup:
        httpGet:
          path: /
          port: 80
        failureThreshold: 30
      liveness:
        httpGet:
          path: /
          port: 80
        initialDelaySeconds: 15
        failureThreshold: 3
      readiness:
        httpGet:
          path: /
          port: 80
        initialDelaySeconds: 5
        failureThreshold: 3
  resource:
    replicas: 1
    requests:
      cpu: 200m
      memory: 204Mi
    limits:
      cpu: 2000m
      memory: 2048Mi`

	huma.Register(grp, huma.Operation{
		OperationID: "ap-create",
		Method:      http.MethodPut,
		Path:        "/",
		Summary:     "Create or replace AP",
		Description: "Create an AP instance by applying a single manifest (PUT). Returns the created resource as YAML.\n\n**Request body usage:**\n- Send exactly one AP resource in the `yaml` field.\n- The manifest must use `apiVersion: example.crossplane.io/v1` and `kind: AP`.\n- The AP `spec` is the desired state consumed by the Crossplane Composition; it drives the generated Deployment, Service(s), and optional Ingress.\n\n**How the AP `spec` is used:**\n- `spec.name`: logical instance name used for composed-resource naming. If omitted, `metadata.name` is used.\n- `spec.projectName`: optional Project claim in the same namespace.\n- `spec.input.image`: container image for the Deployment.\n- `spec.input.network.privatePort`: App Listening Port for the private-only Network path.\n- `spec.input.endpoints`: legacy/public array of `{port, host?, public?}` entries. Each public entry creates Service + Ingress wiring.\n- `spec.input.port` / `spec.input.host`: legacy single-endpoint alternative when `input.endpoints` is omitted.\n- `spec.input.env`: environment variables (`name` + `value` or `valueFrom`).\n- `spec.input.probes`: health probes (startup, liveness, readiness).\n- `spec.input.imagePullPolicy`: image pull policy (default Always).\n- `spec.resource.replicas`: Deployment replica count.\n- `spec.resource.requests` / `spec.resource.limits`: container cpu/memory.\n- `spec.paused` / `spec.restartRequest` / `spec.ingressAnnotations`: lifecycle and Ingress metadata.\n\n**Response:** Returns the created AP in YAML format (server state after apply).\n\n**Copy-pasteable example (use in `yaml` field):**\n```yaml\n" + exampleYAML + "\n```",
		Tags:        []string{"AP"},
	}, func(ctx context.Context, input *createInput) (*createOutput, error) {
		restConfig, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		if input.Body.YAML == "" {
			return nil, huma.Error400BadRequest("body.yaml is required", nil)
		}

		var obj unstructured.Unstructured
		if err := yaml.Unmarshal([]byte(input.Body.YAML), &obj.Object); err != nil {
			return nil, huma.Error400BadRequest("invalid YAML", err)
		}
		name := obj.GetName()
		if name == "" {
			return nil, huma.Error400BadRequest("metadata.name is required", nil)
		}
		ns := obj.GetNamespace()
		if ns == "" {
			gvr := middleware.PodsGVR()
			resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
				Namespace:        "",
				AllNamespaces:    false,
				DefaultNamespace: "default",
				AdminCheckGVR:    &gvr,
			})
			if err != nil {
				return nil, huma.Error500InternalServerError("failed to resolve namespace", err)
			}
			ns = resolved.Namespace
			if ns == "" {
				ns = "default"
			}
			obj.SetNamespace(ns)
			yamlBytes, _ := yaml.Marshal(obj.Object)
			input.Body.YAML = string(yamlBytes)
		}

		if err := k8ssvc.ApplyYAML(restConfig, []byte(input.Body.YAML), ns); err != nil {
			return nil, huma.Error500InternalServerError("failed to create AP", err)
		}

		jsonBytes, err := k8ssvc.Get(cfg, k8ssvc.GetOptions{
			Resource:  "aps",
			Name:      name,
			Namespace: ns,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get created AP", err)
		}

		var created map[string]interface{}
		if err := json.Unmarshal(jsonBytes, &created); err != nil {
			return nil, huma.Error500InternalServerError("failed to marshal created AP", err)
		}
		yamlBytes, err := yaml.Marshal(created)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to marshal created AP to YAML", err)
		}
		out := createOutput{}
		out.Body.YAML = string(yamlBytes)
		return &out, nil
	})
}

func registerUpdate(grp huma.API) {
	type updateInput struct {
		middleware.AuthInput
		Name      string          `query:"name" required:"true" doc:"AP instance name to patch"`
		Namespace string          `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
		Body      json.RawMessage `contentType:"application/json" required:"true" doc:"JSON merge patch body applied to the AP resource.\n\nWhat to patch:\n- spec.input.image: update the application image.\n- spec.input.network.privatePort: update the App Listening Port targeted by the Private Address.\n- spec.resource.replicas: desired replica count when running (ignored while spec.paused is true).\n- spec.paused: when true, scale the Deployment to 0 with SealOS pause annotations; false resumes using spec.resource.replicas.\n- spec.restartRequest: bump this integer to roll pods via Composition (alternative: POST .../restart on the Deployment).\n- spec.input.endpoints: replace the legacy/public endpoint list; each item is {port, host?, public?}.\n- spec.input.port / spec.input.host: legacy single-endpoint wiring when endpoints is omitted.\n- spec.input.env: replace the full environment variable list.\n- spec.input.probes: replace health probes (startup, liveness, readiness).\n- spec.resource.requests / spec.resource.limits: container resources.\n- spec.ingressAnnotations: add or replace Ingress annotations.\n\nPatch examples:\n- Pause: {\"spec\":{\"paused\":true}}\n- Resume: {\"spec\":{\"paused\":false}}\n- Update image: {\"spec\":{\"input\":{\"image\":\"nginx:1.27\"}}}\n- Change Private Address target port: {\"spec\":{\"input\":{\"network\":{\"privatePort\":8080}}}}\n- Change replicas: {\"spec\":{\"resource\":{\"replicas\":2}}}\n- Replace legacy endpoints: {\"spec\":{\"input\":{\"endpoints\":[{\"port\":80,\"host\":\"app.example.com\"}]}}}\n\nPatch semantics:\n- Only the fields you send are changed.\n- Nested objects merge at the subtree you provide.\n- Arrays such as spec.input.endpoints and spec.input.env are replaced as whole lists."`
	}
	type updateOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID: "ap-update",
		Method:      http.MethodPatch,
		Path:        "/",
		Summary:     "Update AP",
		Description: "Patch an AP instance by name.\n\nRequest parameter usage:\n- `name` is required and selects the AP to patch.\n- `namespace` is optional; admins can use it to target a different namespace.\n- The request body must be a JSON merge patch fragment for the AP resource.\n\nPatch semantics:\n- Only the fields present in the patch body are changed.\n- Nested objects are merged at the subtree you provide.\n- Arrays such as `spec.input.endpoints` and `spec.input.env` are replaced as whole lists.\n\nCommon patch targets:\n- `spec.input.image`: change the deployed image.\n- `spec.input.network.privatePort`: change the Private Address target port.\n- `spec.resource.replicas`: scale the Deployment.\n- `spec.input.endpoints`: replace legacy/public endpoint list.\n- `spec.input.env` / `spec.input.probes`: container env and probes.\n- `spec.resource.requests` / `spec.resource.limits`: container resources.\n- `spec.paused` / `spec.restartRequest` / `spec.ingressAnnotations`: lifecycle and Ingress metadata.",
		Tags:        []string{"AP"},
	}, func(ctx context.Context, input *updateInput) (*updateOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		if input.Name == "" {
			return nil, huma.Error400BadRequest("name is required", nil)
		}
		if len(input.Body) == 0 {
			return nil, huma.Error400BadRequest("patch body is required", nil)
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

		jsonBytes, err := k8ssvc.Patch(cfg, k8ssvc.PatchOptions{
			Resource:  "aps",
			Name:      input.Name,
			Namespace: resolved.Namespace,
			PatchType: k8ssvc.PatchTypeMerge,
			Patch:     input.Body,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("AP not found", err)
			}
			return nil, huma.Error500InternalServerError("failed to update AP", err)
		}
		return &updateOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}

func registerDelete(grp huma.API) {
	type deleteInput struct {
		middleware.AuthInput
		Name      string `query:"name" required:"true" doc:"AP instance name to delete"`
		Namespace string `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
	}
	type deleteOutput struct {
		Body struct {
			Status string `json:"status"`
		}
	}

	huma.Register(grp, huma.Operation{
		OperationID: "ap-delete",
		Method:      http.MethodDelete,
		Path:        "/",
		Summary:     "Delete AP",
		Description: "Delete an AP instance by name.\n\nParameter usage:\n- `name` is required and selects the AP to delete.\n- `namespace` is optional; admins can override the namespace from kubeconfig.\n\nBehavior:\n- The AP and its composed resources (Deployment, Services, Ingress) are owned by Crossplane and should be garbage-collected when the AP is deleted.",
		Tags:        []string{"AP"},
	}, func(ctx context.Context, input *deleteInput) (*deleteOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		if input.Name == "" {
			return nil, huma.Error400BadRequest("name is required", nil)
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

		_, err = k8ssvc.Delete(cfg, k8ssvc.DeleteOptions{
			Resource:  "aps",
			Name:      input.Name,
			Namespace: resolved.Namespace,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("AP not found", err)
			}
			return nil, huma.Error500InternalServerError("failed to delete AP", err)
		}
		return &deleteOutput{
			Body: struct {
				Status string `json:"status"`
			}{
				Status: "deleted",
			},
		}, nil
	})
}

// Composed Deployment name matches the AP (metadata.name); see
// aps-deployment-ingress-go-templating (Deployment metadata.name: {{ $name }}).

func registerRestart(grp huma.API) {
	type restartBody struct {
		Name      string `json:"name" required:"true" doc:"AP claim metadata.name; the composed Deployment uses the same name in the same namespace."`
		Namespace string `json:"namespace" doc:"Namespace of the AP (default from kubeconfig; admin can override)."`
	}
	type restartInput struct {
		middleware.AuthInput
		Body restartBody
	}
	type restartOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID: "ap-restart",
		Method:      http.MethodPost,
		Path:        "/restart",
		Summary:     "Restart AP workload (rollout restart Deployment)",
		Description: "Rollout-restarts the underlying Deployment for an AP (e.g. composition `aps-deployment-ingress-go-templating`): " +
			"the Deployment is named like the AP (`metadata.name`) in the same namespace. " +
			"Equivalent to `kubectl rollout restart deployment/<name>`.",
		Tags: []string{"AP"},
	}, func(ctx context.Context, input *restartInput) (*restartOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		name := strings.TrimSpace(input.Body.Name)
		if name == "" {
			return nil, huma.Error400BadRequest("name is required", nil)
		}

		gvr := middleware.PodsGVR()
		resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
			Namespace:        input.Body.Namespace,
			AllNamespaces:    false,
			DefaultNamespace: "",
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}

		jsonBytes, err := k8ssvc.RolloutRestart(cfg, k8ssvc.RolloutOptions{
			Resource:  "deployment",
			Name:      name,
			Namespace: resolved.Namespace,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("deployment for AP not found in namespace (expected same name as the AP claim)", err)
			}
			return nil, huma.Error500InternalServerError("failed to restart deployment", err)
		}
		return &restartOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}
