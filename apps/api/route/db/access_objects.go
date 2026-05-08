package db

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"

	"sealos/api/middleware"
	dbsvc "sealos/api/service/db"
)

func registerAccessObjects(grp huma.API) {
	type dbAccessObjectsBody struct {
		ProjectUID string                 `json:"projectUid" required:"true" doc:"Project metadata.uid that must match the DB ownership label."`
		Namespace  string                 `json:"namespace,omitempty" doc:"Namespace (default from kubeconfig; admin can override)."`
		Parent     *dbsvc.AccessObjectRef `json:"parent,omitempty" doc:"Returned object ref to browse children under. Omit or set null to list root objects."`
		Kinds      []string               `json:"kinds,omitempty" doc:"Optional object kinds to include. Supported values include database, schema, table, view, collection, key, and index."`
	}
	type dbAccessObjectsInput struct {
		middleware.AuthInput
		Name string `path:"name" doc:"DB claim metadata.name."`
		Body dbAccessObjectsBody
	}
	type dbAccessObjectsOutput struct {
		Body dbsvc.AccessObjectsResult
	}

	huma.Register(grp, huma.Operation{
		OperationID: "db-access-objects",
		Method:      http.MethodPost,
		Path:        "/{name}/access/objects",
		Summary:     "Browse DB objects",
		Description: "Lists read-only database objects for one managed DB claim. Requires kubeconfig authorization and projectUid ownership. Credentials and WhoDB operation details stay server-side.",
		Tags:        []string{"DB"},
	}, func(ctx context.Context, input *dbAccessObjectsInput) (*dbAccessObjectsOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error401Unauthorized("invalid kubeconfig", err)
		}
		if strings.TrimSpace(input.Body.ProjectUID) == "" {
			return nil, huma.Error400BadRequest("projectUid is required", nil)
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

		store, err := dbsvc.NewKubernetesAccessHealthStore(resolved.RestConfig)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to initialize DB access store", err)
		}
		service := dbsvc.AccessObjectsService{
			Store: store,
			WhoDB: dbsvc.NewWhoDBHTTPClient(
				os.Getenv("WHODB_URL"),
				http.DefaultClient,
				15*time.Second,
			),
		}
		result, err := service.List(ctx, dbsvc.AccessObjectsRequest{
			Name:       input.Name,
			Namespace:  resolved.Namespace,
			ProjectUID: input.Body.ProjectUID,
			Parent:     input.Body.Parent,
			Kinds:      input.Body.Kinds,
		})
		if err != nil {
			return nil, accessObjectsError(err)
		}
		return &dbAccessObjectsOutput{Body: *result}, nil
	})
}

func accessObjectsError(err error) error {
	switch {
	case errors.Is(err, dbsvc.ErrAccessObjectsInvalidRef):
		return huma.Error422UnprocessableEntity("invalid DB object ref", err)
	case errors.Is(err, dbsvc.ErrAccessObjectsUnsupportedKind):
		return huma.Error422UnprocessableEntity("unsupported DB object kind", err)
	case errors.Is(err, dbsvc.ErrAccessHealthProjectUID):
		return huma.Error400BadRequest("projectUid is required", err)
	case errors.Is(err, dbsvc.ErrAccessHealthDBNotFound):
		return huma.Error404NotFound("DB not found", err)
	case errors.Is(err, dbsvc.ErrAccessHealthProjectForbidden):
		return huma.Error403Forbidden("DB does not belong to project", err)
	case errors.Is(err, dbsvc.ErrAccessHealthProjectMissing):
		return huma.Error409Conflict("DB is missing project ownership metadata", err)
	case errors.Is(err, dbsvc.ErrAccessHealthDBNotReady):
		return huma.Error409Conflict("DB is not ready", err)
	case errors.Is(err, dbsvc.ErrAccessHealthSecretMissing):
		return huma.Error409Conflict("DB connection secret is missing", err)
	case errors.Is(err, dbsvc.ErrAccessHealthUnsupported):
		return huma.Error422UnprocessableEntity("unsupported DB engine", err)
	case errors.Is(err, dbsvc.ErrAccessHealthWhoDBMissing):
		return huma.Error503ServiceUnavailable("WHODB_URL is not configured", err)
	case errors.Is(err, dbsvc.ErrAccessHealthWhoDBTimeout):
		return huma.Error504GatewayTimeout("WhoDB request timed out", err)
	case errors.Is(err, dbsvc.ErrAccessHealthWhoDBUnavailable):
		return huma.Error503ServiceUnavailable("WhoDB is unavailable", err)
	default:
		return huma.Error500InternalServerError("failed to browse DB objects", err)
	}
}
