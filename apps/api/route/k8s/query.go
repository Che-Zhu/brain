package k8s

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	corev1 "k8s.io/api/core/v1"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	"sealos/api/middleware"
	"sealos/api/service/authlog"
	k8ssvc "sealos/api/service/k8s"
	projectsvc "sealos/api/service/project"
)

func registerGet(grp huma.API) {
	type getInput struct {
		Authorization string `header:"Authorization" doc:"Bearer url-encoded kubeconfig (omit when using share token)"`
		ShareToken    string `header:"X-Share-Token" doc:"Project share JWT; uses ENCODED_ADMIN_KUBECONFIG and confines results to that project"`
		ShareTokenQP  string `query:"shareToken" doc:"Same as X-Share-Token (for browser links)"`
		Kind          string `query:"kind" required:"true" doc:"Resource kind (e.g. pods, deploy)"`
		Name          string `query:"name" doc:"Resource name"`
		Namespace     string `query:"namespace" doc:"Namespace (default from kubeconfig)"`
		LabelSelector string `query:"label-selector" doc:"Label selector"`
		FieldSelector string `query:"field-selector" doc:"Field selector"`
		AllNamespaces string `query:"all-namespaces" doc:"List all namespaces (true/1)"`
	}
	type getOutput struct {
		Body json.RawMessage
	}
	handler := func(ctx context.Context, input *getInput) (*getOutput, error) {
		shareTok := strings.TrimSpace(input.ShareToken)
		if shareTok == "" {
			shareTok = strings.TrimSpace(input.ShareTokenQP)
		}
		authz := strings.TrimSpace(input.Authorization)

		var cfg *clientcmdapi.Config
		var err error
		allNs := input.AllNamespaces == "true" || input.AllNamespaces == "1"
		opts := k8ssvc.GetOptions{
			Resource:      input.Kind,
			Name:          input.Name,
			Namespace:     input.Namespace,
			LabelSelector: input.LabelSelector,
			FieldSelector: input.FieldSelector,
			AllNamespaces: allNs,
		}

		if shareTok != "" {
			authlog.Info("k8s get: share token auth kind=%q namespace=%q shareToken=%s",
				input.Kind, input.Namespace, authlog.SecretMeta(shareTok))
			if authz != "" {
				authlog.Warn("k8s get: rejected both Authorization and share token")
				return nil, huma.Error400BadRequest("send either Authorization or share token, not both", nil)
			}
			if allNs {
				return nil, huma.Error400BadRequest("all-namespaces is not allowed with share token", nil)
			}
			if !projectsvc.ShareK8sKindAllowed(input.Kind) {
				return nil, huma.Error403Forbidden("share token only allows kind ap/aps for this API", nil)
			}
			adminCfg, err := middleware.AdminKubeconfigFromEnv()
			if err != nil {
				return nil, huma.Error500InternalServerError("admin kubeconfig not configured", err)
			}
			validated, err := projectsvc.ValidateShareAccess(ctx, adminCfg, shareTok)
			if err != nil {
				switch {
				case errors.Is(err, projectsvc.ErrShareProjectNotPublic):
					authlog.Warn("k8s get: share denied — project not public namespace=%q", input.Namespace)
					return nil, huma.Error403Forbidden("project is not shared publicly", err)
				case errors.Is(err, projectsvc.ErrShareForbidden):
					authlog.Warn("k8s get: share denied — permission not allowed")
					return nil, huma.Error403Forbidden("share permission not allowed", err)
				case errors.Is(err, projectsvc.ErrShareTokenInvalid):
					authlog.Warn("k8s get: share denied — invalid token err=%v", err)
					return nil, huma.Error401Unauthorized("invalid share token", err)
				default:
					authlog.Warn("k8s get: share validation failed err=%v", err)
					return nil, huma.Error401Unauthorized("share token validation failed", err)
				}
			}
			authlog.Info("k8s get: share authorized projectUID=%q namespace=%q",
				validated.ProjectUID, validated.Claims.Namespace)
			opts.Namespace = validated.Claims.Namespace
			opts.LabelSelector = projectsvc.ProjectUIDLabel + "=" + validated.ProjectUID
			opts.FieldSelector = ""
			if opts.Name != "" {
				if err := projectsvc.VerifyAPInShareProject(ctx, adminCfg, opts.Namespace, opts.Name, validated.ProjectUID); err != nil {
					return nil, huma.Error403Forbidden("resource not part of shared project", err)
				}
			}
			cfg = adminCfg
		} else {
			if authz == "" {
				authlog.Warn("k8s get: rejected — missing Authorization and share token kind=%q", input.Kind)
				return nil, huma.Error400BadRequest("Authorization or share token is required", nil)
			}
			authlog.Info("k8s get: kubeconfig auth kind=%q authorization=%s",
				input.Kind, authlog.SecretMeta(authz))
			_, cfg, err = middleware.RestConfigFromAuth(authz)
			if err != nil {
				authlog.Warn("k8s get: invalid kubeconfig err=%v", err)
				return nil, huma.Error400BadRequest("invalid kubeconfig", err)
			}
			gvr := middleware.PodsGVR()
			resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
				Namespace:        input.Namespace,
				AllNamespaces:    allNs,
				DefaultNamespace: "",
				AdminCheckGVR:    &gvr,
			})
			if err != nil {
				return nil, huma.Error500InternalServerError("failed to resolve request context", err)
			}
			opts.Namespace = resolved.Namespace
		}

		jsonBytes, err := k8ssvc.Get(cfg, opts)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get resource", err)
		}
		return &getOutput{Body: json.RawMessage(jsonBytes)}, nil
	}
	huma.Register(grp, huma.Operation{
		OperationID: "k8s-get",
		Method:      http.MethodGet,
		Path:        "/get",
		Summary:     "Get resources",
		Description: "Get or list Kubernetes resources. Use kind (e.g. pods, deploy) and optionally name.",
		Tags:        []string{"K8s"},
	}, handler)
	huma.Register(grp, huma.Operation{
		OperationID: "k8s-get-root", Method: http.MethodGet, Path: "/",
		Summary: "Get resources (alias)", Tags: []string{"K8s"}, Hidden: true,
	}, handler)
}

func registerDescribe(grp huma.API) {
	type describeInput struct {
		middleware.AuthInput
		Kind          string `query:"kind" required:"true" doc:"Resource kind"`
		Name          string `query:"name" doc:"Resource name"`
		Namespace     string `query:"namespace" doc:"Namespace"`
		LabelSelector string `query:"label-selector" doc:"Label selector"`
		FieldSelector string `query:"field-selector" doc:"Field selector"`
		AllNamespaces string `query:"all-namespaces" doc:"All namespaces (true/1)"`
	}
	type describeOutput struct {
		Body json.RawMessage
	}
	huma.Register(grp, huma.Operation{
		OperationID:  "k8s-describe",
		Method:       http.MethodGet,
		Path:         "/describe",
		Summary:      "Describe resource",
		Description:  "Describe Kubernetes resources (events, conditions, etc.).",
		Tags:         []string{"K8s"},
	}, func(ctx context.Context, input *describeInput) (*describeOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		allNs := input.AllNamespaces == "true" || input.AllNamespaces == "1"
		gvr := middleware.PodsGVR()
		resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
			Namespace:        input.Namespace,
			AllNamespaces:    allNs,
			DefaultNamespace: "",
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}
		opts := k8ssvc.DescribeOptions{
			Resource:      input.Kind,
			Name:          input.Name,
			Namespace:     resolved.Namespace,
			LabelSelector: input.LabelSelector,
			FieldSelector: input.FieldSelector,
			AllNamespaces: allNs,
		}
		jsonBytes, err := k8ssvc.Describe(cfg, opts)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to describe", err)
		}
		return &describeOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}

func registerLogs(grp huma.API) {
	type logsInput struct {
		middleware.AuthInput
		Pod        string `query:"pod" required:"true" doc:"Pod name"`
		Namespace  string `query:"namespace" doc:"Namespace"`
		Container  string `query:"container" doc:"Container name"`
		Tail       string `query:"tail" doc:"Lines to show from end"`
		Since      string `query:"since" doc:"Show logs since (seconds)"`
		Timestamps string `query:"timestamps" doc:"Add timestamps (true)"`
		Previous   string `query:"previous" doc:"Previous container logs (true)"`
	}
	type logsOutput struct {
		Body string `contentType:"text/plain"`
	}
	huma.Register(grp, huma.Operation{
		OperationID:  "k8s-logs",
		Method:      http.MethodGet,
		Path:        "/logs",
		Summary:     "Get pod logs",
		Description: "Stream logs from a pod.",
		Tags:        []string{"K8s"},
	}, func(ctx context.Context, input *logsInput) (*logsOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		gvr := middleware.PodsGVR()
		resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
			Namespace:        input.Namespace,
			AllNamespaces:    false,
			DefaultNamespace: corev1.NamespaceDefault,
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}
		tail, _ := strconv.ParseInt(input.Tail, 10, 64)
		since, _ := strconv.ParseInt(input.Since, 10, 64)
		opts := k8ssvc.LogsOptions{
			Pod:          input.Pod,
			Namespace:    resolved.Namespace,
			Container:    input.Container,
			TailLines:    tail,
			SinceSeconds: since,
			Timestamps:   input.Timestamps == "true",
			Previous:     input.Previous == "true",
		}
		logBytes, err := k8ssvc.LogsBytes(cfg, opts)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get logs", err)
		}
		return &logsOutput{Body: string(logBytes)}, nil
	})
}

func registerTop(grp huma.API) {
	type topInput struct {
		middleware.AuthInput
		Kind          string `query:"kind" doc:"Resource kind (default: pods)"`
		Name          string `query:"name" doc:"Resource name"`
		Namespace     string `query:"namespace" doc:"Namespace"`
		AllNamespaces string `query:"all-namespaces" doc:"All namespaces (true/1)"`
		Containers    string `query:"containers" doc:"Show containers (true)"`
	}
	type topOutput struct {
		Body json.RawMessage
	}
	huma.Register(grp, huma.Operation{
		OperationID:  "k8s-top",
		Method:      http.MethodGet,
		Path:        "/top",
		Summary:     "Resource usage",
		Description: "Get CPU/memory usage (like kubectl top). Requires metrics-server.",
		Tags:        []string{"K8s"},
	}, func(ctx context.Context, input *topInput) (*topOutput, error) {
		_, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		allNs := input.AllNamespaces == "true" || input.AllNamespaces == "1"
		gvr := middleware.PodsGVR()
		resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
			Namespace:        input.Namespace,
			AllNamespaces:    allNs,
			DefaultNamespace: "",
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}
		opts := k8ssvc.TopOptions{
			Resource:      input.Kind,
			Name:          input.Name,
			Namespace:     resolved.Namespace,
			AllNamespaces: allNs,
			Containers:    input.Containers == "true",
		}
		if opts.Resource == "" {
			opts.Resource = "pods"
		}
		jsonBytes, err := k8ssvc.Top(cfg, opts)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to get top", err)
		}
		return &topOutput{Body: json.RawMessage(jsonBytes)}, nil
	})
}
