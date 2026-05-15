package db

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"sealos/api/middleware"
	k8ssvc "sealos/api/service/k8s"
)

func registerGet(grp huma.API) {
	type dbGetInput struct {
		middleware.AuthInput
		Name      string `query:"name" doc:"DB instance name (omit to list all in namespace)"`
		Namespace string `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
	}
	type dbGetOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID: "db-get",
		Method:      http.MethodGet,
		Path:        "/",
		Summary:     "Get DB(s)",
		Description: "Get a single DB by name or list DBs in the namespace.\n\nParameter usage:\n- `name` is optional. If omitted, the endpoint lists all DBs in the resolved namespace.\n- `namespace` is optional. It uses the kubeconfig namespace by default; admins can override it.\n\nWhat the DB represents:\n- DB is the Crossplane composite resource (`example.crossplane.io/v1`, kind `DB`) that composes the KubeBlocks Cluster (PostgreSQL, MySQL, Redis, MongoDB, etc.).\n- The DB spec includes `engine`, `quota`, optional `replicas` (default 1), optional `paused`, optional `restartRequest`, optional `storageSize` and resource overrides, optional `terminationPolicy` (default Delete), optional `scheduledBackup` (automated backup policy; legacy `backup` is deprecated), optional `restoreFromBackup` (restore-from-backup for postgres/mysql/mongodb/redis), and optional `exposeNodePort` (default false; when true, a NodePort Service `{name}-export` is composed). Claims may set `metadata.labels.region` to a public URL host base for tooling (e.g. 192.168.12.53.nip.io).\n\nResponse:\n- Returns the DB resource(s) with `spec` and product-facing `status.phase` (`Creating`, `Running`, `Updating`, `Restarting`, `Stopping`, `Paused`, `Starting`, `Failed`, `Deleting`, `Unknown`).\n- Raw KubeBlocks details are exposed under `status.observed` for debugging, while API/UI should consume `status.phase` as the lifecycle source of truth.\n- KubeBlocks creates a connection credential secret `{name}-conn-credential` in the same namespace when the cluster is ready.\n- `status.backups`: KubeBlocks Backup resources with label `dataprotection.kubeblocks.io/cluster-uid` equal to the composed Cluster's UID.",
		Tags:        []string{"DB"},
	}, func(ctx context.Context, input *dbGetInput) (*dbGetOutput, error) {
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
			Resource:  "dbs",
			Name:      input.Name,
			Namespace: resolved.Namespace,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get DB(s)", err)
		}
		return &dbGetOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}
