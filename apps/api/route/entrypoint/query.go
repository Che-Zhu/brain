package entrypoint

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
		LabelSelector string `query:"label-selector" doc:"Optional Kubernetes label selector used when listing EntryPoints"`
		Name          string `query:"name" doc:"EntryPoint name (omit to list all in namespace)"`
		Namespace     string `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
	}
	type getOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID: "entrypoint-get",
		Method:      http.MethodGet,
		Path:        "/",
		Summary:     "Get EntryPoint(s)",
		Description: "Get a single EntryPoint by name or list EntryPoints in the namespace.\n\nEntryPoint is the Crossplane resource that represents public access for an AP. It exposes platform-assigned domains, target ports, aggregate status, and Custom Domain Binding status for DNS, routing, and certificate lifecycle.",
		Tags:        []string{"EntryPoint"},
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
			LabelSelector: input.LabelSelector,
			Resource:      "entrypoints",
			Name:          input.Name,
			Namespace:     resolved.Namespace,
		})
		if err != nil {
			if body, ok := emptyListForMissingEntryPointResource(err); ok {
				return &getOutput{Body: body}, nil
			}
			return nil, huma.Error500InternalServerError("failed to get EntryPoint(s)", err)
		}
		return &getOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}

func emptyListForMissingEntryPointResource(err error) (json.RawMessage, bool) {
	if !k8ssvc.IsUnknownResourceError(err, "entrypoints") {
		return nil, false
	}
	return json.RawMessage(`{"apiVersion":"example.crossplane.io/v1alpha1","kind":"EntryPointList","items":[]}`), true
}
