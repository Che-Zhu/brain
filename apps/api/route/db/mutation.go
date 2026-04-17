package db

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"

	"sealos/api/middleware"
	dbsvc "sealos/api/service/db"
	k8ssvc "sealos/api/service/k8s"
)

func registerCreate(grp huma.API) {
	type dbCreateBody struct {
		YAML string `json:"yaml" required:"true" doc:"DB manifest (YAML or JSON). Must be a single example.crossplane.io/v1, kind: DB resource.\n\nDB metadata (convention):\n- metadata.namespace: target namespace (examples use the literal name default; override in production).\n- metadata.labels.region: optional public URL host base / domain for client-facing URL composition (convention; example 192.168.12.53.nip.io).\n\nDB spec fields:\n- spec.engine: database engine (postgresql, mysql, redis, mongodb).\n- spec.quota: resource preset xs|s|m|l (default xs); per-engine CPU/memory/storage from the active Composition. Omitted cpuRequest, memoryRequest, cpuLimit, memoryLimit, storageSize are filled from the quota preset.\n- spec.replicas: optional; defaults to 1 when omitted (XRD default).\n- spec.storageSize: optional PVC override; when omitted, quota preset supplies engine-specific storage.\n- spec.cpuRequest / spec.memoryRequest: optional overrides for quota preset defaults.\n- spec.cpuLimit / spec.memoryLimit: optional overrides (PostgreSQL, MySQL, Redis).\n- spec.storageClassName: StorageClass for PVCs; omit to use cluster default.\n- spec.terminationPolicy: optional Delete or WipeOut; defaults to Delete when omitted (XRD default).\n- spec.exposeNodePort: optional; when true, compose a NodePort Service {name}-export; nodePort is omitted so the cluster allocates a free port (default false).\n- spec.scheduledBackup: optional cron/retention/repo for KubeBlocks automated backups.\n- spec.restoreFromBackup: optional restore-from-backup (postgresql/mysql/mongodb/redis) with backupName and optional namespace/volumeRestorePolicy.\n- spec.crossplane.compositionRef.name: select Composition (e.g. dbs-postgresql-kubeblocks-go-templating)."`
	}
	type dbCreateInput struct {
		middleware.AuthInput
		Body dbCreateBody
	}
	type dbCreateOutput struct {
		Body struct {
			YAML string `json:"yaml" doc:"The created DB resource in YAML format (server state after apply)."`
		}
	}

	exampleYAML := `apiVersion: example.crossplane.io/v1
kind: DB
metadata:
  name: db-postgresql
  namespace: default
  labels:
    region: 192.168.12.53.nip.io
spec:
  crossplane:
    compositionRef:
      name: dbs-postgresql-kubeblocks-go-templating
  engine: postgresql
  quota: xs`

	huma.Register(grp, huma.Operation{
		OperationID: "db-create",
		Method:      http.MethodPut,
		Path:        "/",
		Summary:     "Create or replace DB",
		Description: "Create a DB instance by applying a single manifest (PUT). Returns the created resource as YAML.\n\n**Request body usage:**\n- Send exactly one DB resource in the `yaml` field.\n- The manifest must use `apiVersion: example.crossplane.io/v1` and `kind: DB`.\n- The DB `spec` is the desired state consumed by the Crossplane Composition; it drives the KubeBlocks Cluster.\n\n**How the DB `spec` is used:**\n- `spec.engine`: database engine (postgresql, mysql, redis, mongodb).\n- `metadata.namespace` / `metadata.labels.region`: set target namespace and optional public host base for URL composition.\n- `spec.quota`: resource preset `xs`, `s`, `m`, or `l` (default `xs`); each Composition maps quotas to CPU, memory, storage, and optional limits.\n- `spec.replicas`: optional replica count (XRD default 1 when omitted).\n- `spec.storageSize`, `spec.cpuRequest`, `spec.memoryRequest`, `spec.cpuLimit`, `spec.memoryLimit`: optional overrides for quota preset defaults.\n- `spec.storageClassName`: StorageClass for PVCs; omit to use cluster default.\n- `spec.terminationPolicy`: optional Delete or WipeOut (XRD default Delete).\n- `spec.exposeNodePort`: optional boolean (default false); when true, the Composition creates a NodePort Service `{name}-export` with apiserver-assigned nodePort.\n- `spec.scheduledBackup`: optional automated backup schedule/retention/repo for KubeBlocks (legacy `spec.backup` is deprecated).\n- `spec.restoreFromBackup`: optional restore block for postgres/mysql/mongodb/redis; set `backupName`, optional `namespace` and `volumeRestorePolicy` (default Parallel), plus optional `connectionPassword` for MySQL.\n- `spec.crossplane.compositionRef.name`: select Composition (e.g. dbs-postgresql-kubeblocks-go-templating).\n\n**Response:** Returns the created DB in YAML format (server state after apply).\n\n**Copy-pasteable example (use in `yaml` field):**\n```yaml\n" + exampleYAML + "\n```",
		Tags:        []string{"DB"},
	}, func(ctx context.Context, input *dbCreateInput) (*dbCreateOutput, error) {
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

		if err := k8ssvc.ApplyYAML(restConfig, []byte(input.Body.YAML)); err != nil {
			return nil, huma.Error500InternalServerError("failed to create DB", err)
		}

		jsonBytes, err := k8ssvc.Get(cfg, k8ssvc.GetOptions{
			Resource:  "dbs",
			Name:      name,
			Namespace: ns,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get created DB", err)
		}

		var created map[string]interface{}
		if err := json.Unmarshal(jsonBytes, &created); err != nil {
			return nil, huma.Error500InternalServerError("failed to marshal created DB", err)
		}
		yamlBytes, err := yaml.Marshal(created)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to marshal created DB to YAML", err)
		}
		out := dbCreateOutput{}
		out.Body.YAML = string(yamlBytes)
		return &out, nil
	})
}

func registerBackup(grp huma.API) {
	type dbBackupBody struct {
		Name       string `json:"name" required:"true" doc:"DB instance name to create backup for"`
		BackupName string `json:"backupName,omitempty" doc:"Name for the Backup CR (defaults to {name}-manual-{timestamp})"`
		Namespace  string `json:"namespace,omitempty" doc:"Namespace (default from kubeconfig; admin can override)"`
	}
	type dbBackupInput struct {
		middleware.AuthInput
		Body dbBackupBody
	}
	type dbBackupOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID: "db-backup",
		Method:      http.MethodPost,
		Path:        "/backup",
		Summary:     "Create backup for DB",
		Description: "Create an on-demand KubeBlocks backup for a specific DB.\n\n" +
			"The DB must have a running KubeBlocks Cluster with backup enabled (BackupPolicy exists). " +
			"For PostgreSQL, uses pg-basebackup method. Returns the created Backup resource.",
		Tags: []string{"DB"},
	}, func(ctx context.Context, input *dbBackupInput) (*dbBackupOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		if input.Body.Name == "" {
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
			return nil, huma.Error500InternalServerError("failed to resolve namespace", err)
		}
		ns := resolved.Namespace

		jsonBytes, err := dbsvc.CreateBackupForDB(cfg, dbsvc.CreateBackupForDBOptions{
			DBName:     input.Body.Name,
			Namespace:  ns,
			BackupName: input.Body.BackupName,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to create backup", err)
		}
		return &dbBackupOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}

func registerUpdate(grp huma.API) {
	type dbUpdateInput struct {
		middleware.AuthInput
		Name      string          `query:"name" required:"true" doc:"DB instance name to patch"`
		Namespace string          `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
		Body      json.RawMessage `contentType:"application/json" required:"true" doc:"JSON merge patch body applied to the DB resource.\n\nWhat to patch:\n- spec.quota: switch preset xs|s|m|l (recomputes quota preset defaults unless overridden fields remain).\n- spec.replicas: scale the database cluster.\n- spec.storageSize: change PVC storage (may require expansion support).\n- spec.cpuRequest / spec.memoryRequest: resource requests.\n- spec.cpuLimit / spec.memoryLimit: resource limits.\n- spec.storageClassName: StorageClass for PVCs.\n- spec.terminationPolicy: Delete or WipeOut.\n- spec.exposeNodePort: enable or disable NodePort Service {name}-export (boolean).\n- spec.scheduledBackup: cron, enabled, retentionPeriod, repoName (MongoDB) for KubeBlocks automated backups.\n\nPatch examples:\n- Scale replicas: {\"spec\":{\"replicas\":2}}\n- Larger quota: {\"spec\":{\"quota\":\"m\"}}\n- Expose via NodePort: {\"spec\":{\"exposeNodePort\":true}}\n- Update resources: {\"spec\":{\"cpuLimit\":\"2000m\",\"memoryLimit\":\"4Gi\"}}\n- Change storage: {\"spec\":{\"storageSize\":\"20Gi\"}}\n- Backup schedule: {\"spec\":{\"scheduledBackup\":{\"cronExpression\":\"0 2 * * *\",\"retentionPeriod\":\"7d\"}}}\n\nPatch semantics:\n- Only the fields you send are changed.\n- For nested objects like spec, send the subtree you want to modify."`
	}
	type dbUpdateOutput struct {
		Body json.RawMessage
	}

	huma.Register(grp, huma.Operation{
		OperationID: "db-update",
		Method:      http.MethodPatch,
		Path:        "/",
		Summary:     "Update DB",
		Description: "Patch a DB instance by name.\n\nRequest parameter usage:\n- `name` is required and selects the DB to patch.\n- `namespace` is optional; admins can use it to target a different namespace.\n- The request body must be a JSON merge patch fragment for the DB resource.\n\nPatch semantics:\n- Only the fields present in the patch body are changed.\n- Nested objects are merged at the subtree you provide.\n\nCommon patch targets:\n- `spec.quota`: resource preset xs|s|m|l.\n- `spec.replicas`: scale the database cluster.\n- `spec.storageSize`: change PVC storage.\n- `spec.cpuRequest` / `spec.memoryRequest`: resource requests.\n- `spec.cpuLimit` / `spec.memoryLimit`: resource limits.\n- `spec.storageClassName`: StorageClass for PVCs.\n- `spec.terminationPolicy`: Delete or WipeOut.\n- `spec.exposeNodePort`: toggle NodePort Service `{metadata.name}-export`.\n- `spec.scheduledBackup`: automated backup cron/retention/repo (KubeBlocks).",
		Tags:        []string{"DB"},
	}, func(ctx context.Context, input *dbUpdateInput) (*dbUpdateOutput, error) {
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
			Resource:  "dbs",
			Name:      input.Name,
			Namespace: resolved.Namespace,
			PatchType: k8ssvc.PatchTypeMerge,
			Patch:     input.Body,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("DB not found", err)
			}
			return nil, huma.Error500InternalServerError("failed to update DB", err)
		}
		return &dbUpdateOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}

func registerDelete(grp huma.API) {
	type dbDeleteInput struct {
		middleware.AuthInput
		Name      string `query:"name" required:"true" doc:"DB instance name to delete"`
		Namespace string `query:"namespace" doc:"Namespace (default from kubeconfig; admin can override)"`
	}
	type dbDeleteOutput struct {
		Body struct {
			Status string `json:"status"`
		}
	}

	huma.Register(grp, huma.Operation{
		OperationID: "db-delete",
		Method:      http.MethodDelete,
		Path:        "/",
		Summary:     "Delete DB",
		Description: "Delete a DB instance by name.\n\nParameter usage:\n- `name` is required and selects the DB to delete.\n- `namespace` is optional; admins can override the namespace from kubeconfig.\n\nBehavior:\n- The DB and its composed resources (KubeBlocks Cluster, PVCs, etc.) are owned by Crossplane and should be garbage-collected when the DB is deleted.\n- `terminationPolicy` (Delete vs WipeOut) controls whether PVCs are retained.",
		Tags:        []string{"DB"},
	}, func(ctx context.Context, input *dbDeleteInput) (*dbDeleteOutput, error) {
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
			Resource:  "dbs",
			Name:      input.Name,
			Namespace: resolved.Namespace,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("DB not found", err)
			}
			return nil, huma.Error500InternalServerError("failed to delete DB", err)
		}
		return &dbDeleteOutput{
			Body: struct {
				Status string `json:"status"`
			}{
				Status: "deleted",
			},
		}, nil
	})
}
