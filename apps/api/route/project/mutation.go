package project

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"sealos/api/middleware"
	projectsvc "sealos/api/service/project"
)

func registerShare(grp huma.API) {
	type shareBody struct {
		ProjectName string `json:"projectName" doc:"Project claim metadata.name in the target namespace."`
		ProjectUID  string `json:"projectUid" doc:"Project claim metadata.uid; must match the live resource."`
		NS          string `json:"ns" doc:"Namespace of the Project claim. For non-admin kubeconfigs, must match the namespace in the kubeconfig (or omit to use it)."`
		Permission  string `json:"permission" doc:"Share permission; only view is supported. Omitted defaults to view."`
	}
	type shareInput struct {
		middleware.AuthInput
		Body shareBody
	}
	type shareOutput struct {
		Body struct {
			Token     string `json:"token" doc:"HS256 JWT signed with the per-project-per-permission Secret key; payload has projectName, namespace, perm, exp."`
			ExpiresAt int64  `json:"expiresAt" doc:"Unix seconds when the JWT expires."`
		}
	}

	huma.Register(grp, huma.Operation{
		OperationID: "project-share",
		Method:      http.MethodPost,
		Path:        "/share",
		Summary:     "Create or reuse share secret and issue preview JWT",
		Description: "Ensures a Kubernetes Secret named `project-{sanitizedName}-share-{permission}` exists in the namespace " +
			"(creates one with a random key if missing, otherwise reuses the existing key). " +
			"Verifies the Project claim exists and `projectUid` matches `metadata.uid`. " +
			"Patches `spec.public` to true. Returns a JWT signed with HS256 using the Secret's key (no global signing secret). " +
			"Authorization follows the same kubeconfig rules as other APIs.",
		Tags: []string{"Projects"},
	}, func(ctx context.Context, input *shareInput) (*shareOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}

		projectName := strings.TrimSpace(input.Body.ProjectName)
		if projectName == "" {
			return nil, huma.Error400BadRequest("projectName is required", nil)
		}
		projectUID := strings.TrimSpace(input.Body.ProjectUID)
		if projectUID == "" {
			return nil, huma.Error400BadRequest("projectUid is required", nil)
		}

		bodyNS := strings.TrimSpace(input.Body.NS)
		gvr := middleware.PodsGVR()
		resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
			Namespace:        bodyNS,
			AllNamespaces:    false,
			DefaultNamespace: "",
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}

		if resolved.IsAdmin {
			if bodyNS == "" {
				return nil, huma.Error400BadRequest("ns is required when using an admin kubeconfig", nil)
			}
		} else {
			if bodyNS != "" && resolved.Namespace != "" && bodyNS != resolved.Namespace {
				return nil, huma.Error403Forbidden(
					"non-admin kubeconfig cannot target a namespace other than the one in the kubeconfig",
					nil,
				)
			}
			if resolved.Namespace == "" {
				return nil, huma.Error400BadRequest("namespace is not set in kubeconfig and ns was not provided", nil)
			}
		}

		ns := resolved.Namespace
		perm := strings.TrimSpace(input.Body.Permission)
		if perm == "" {
			perm = "view"
		}

		token, exp, err := projectsvc.IssueShareJWT(ctx, resolved.RestConfig, ns, projectName, projectUID, perm)
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("project not found", err)
			}
			if errors.Is(err, projectsvc.ErrProjectUIDMismatch) {
				return nil, huma.Error403Forbidden("projectUid does not match Project resource", err)
			}
			if strings.Contains(err.Error(), "invalid permission") {
				return nil, huma.Error400BadRequest("permission must be view", err)
			}
			return nil, huma.Error500InternalServerError("failed to issue share token", err)
		}

		out := &shareOutput{}
		out.Body.Token = token
		out.Body.ExpiresAt = exp.Unix()
		return out, nil
	})
}
