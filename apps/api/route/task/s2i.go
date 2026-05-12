package task

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/validation"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"

	"sealos/api/middleware"
	k8ssvc "sealos/api/service/k8s"
)

const (
	taskAPIVersion = "example.crossplane.io/v1"
	taskKind       = "Task"
	nanoidAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
)

func nanoid4() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = nanoidAlphabet[int(b[i])%len(nanoidAlphabet)]
	}
	return string(b), nil
}

func repoNameFromURL(repoURL string) string {
	u, err := url.Parse(repoURL)
	if err != nil {
		return "repo"
	}
	path := strings.Trim(u.Path, "/")
	parts := strings.Split(path, "/")
	name := "repo"
	if len(parts) > 0 {
		name = parts[len(parts)-1]
	}
	name = strings.TrimSuffix(strings.ToLower(name), ".git")
	re := regexp.MustCompile(`[^a-z0-9-]+`)
	name = re.ReplaceAllString(name, "-")
	re = regexp.MustCompile(`^-+|-+$`)
	name = re.ReplaceAllString(name, "")
	if name == "" {
		return "repo"
	}
	return name
}

// s2iCompositionSelectorBody maps to Task spec.crossplane.compositionSelector (advanced).
type s2iCompositionSelectorBody struct {
	MatchLabels map[string]string `json:"matchLabels,omitempty" doc:"Labels to select a Crossplane Composition (spec.crossplane.compositionSelector.matchLabels)."`
}

func registerS2i(grp huma.API) {
	type s2iBody struct {
		RepoURL string `json:"repoUrl" required:"true" example:"https://github.com/Svring/app-example" doc:"Git repository URL without credentials (e.g. https://github.com/user/repo)."`
		// Namespace is target namespace for the Task CR and Job; resolved from kubeconfig when omitted.
		Namespace string `json:"namespace,omitempty" doc:"Kubernetes namespace for the Task (default from kubeconfig context; admins may override)."`

		// Optional Task identity (maps to metadata.name and spec.name). If omitted, name is <repo-slug>-<4-char random>.
		Name string `json:"name,omitempty" example:"my-app-build" doc:"Task resource name (metadata.name and spec.name). Must be a valid DNS subdomain label (lowercase, digits, hyphens; max 63 chars). If omitted, derived from the repository path plus a short random suffix."`

		BuilderImage     string `json:"builderImage,omitempty" example:"puddlecat/railpack:latest" doc:"Image for the builder container (spec.builderImage). Default in CRD: puddlecat/railpack:latest."`
		OutputVolumeSize string `json:"outputVolumeSize,omitempty" doc:"Workspace emptyDir size if the composition honors it (spec.outputVolumeSize), e.g. 1Gi."`

		ProjectName string `json:"projectName,omitempty" doc:"Target Instance metadata.name (spec.projectName). With projectUid, after a successful build the composition may create an AP from the pushed image."`
		ProjectUID  string `json:"projectUid,omitempty" doc:"Target Instance metadata.uid (spec.projectUid). Must be set together with projectName for deploy."`

		S2IMode string `json:"s2iMode,omitempty" example:"plan" enum:"build,plan" doc:"build: railpack prepare + BuildKit push to GHCR (default). plan: railpack prepare only; writes plan to result ConfigMap, no build/push."`

		CompositionRef string `json:"compositionRef,omitempty" doc:"Override Crossplane Composition name (spec.crossplane.compositionRef.name). Advanced; leave empty to use the Task CRD default composition."`
		// CompositionSelector selects a composition by labels instead of compositionRef (advanced).
		CompositionSelector *s2iCompositionSelectorBody `json:"compositionSelector,omitempty" doc:"Select Composition by labels (spec.crossplane.compositionSelector). Do not set together with compositionRef unless you know the CRD merge behavior."`
	}
	type s2iInput struct {
		middleware.AuthInput
		Body s2iBody
	}
	type s2iOutput struct {
		Body struct {
			Name      string `json:"name" doc:"Task resource name"`
			Namespace string `json:"namespace" doc:"Namespace the Task was created in"`
			JobName   string `json:"jobName" doc:"Underlying Kubernetes Job name spawned by Crossplane for this task"`
		}
	}

	const s2iCreateDescription = `Creates a Crossplane **Task** (example.crossplane.io/v1) that runs the S2I composition (clone, railpack, optional BuildKit push to GHCR, optional AP deploy).

**Request body (maps to Task spec)**

| Field | Required | Description |
|-------|----------|-------------|
| repoUrl | yes | Git HTTPS URL (no token in URL; use ghcr-cred). |
| namespace | no | Namespace for the Task; defaults from kubeconfig. |
| name | no | Task metadata.name / spec.name. If omitted: <repo-slug>-<random>. |
| builderImage | no | Builder image (default puddlecat/railpack:latest in CRD). |
| outputVolumeSize | no | Workspace volume size if supported by composition. |
| projectName | no | Instance name; pair with projectUid for post-build AP. |
| projectUid | no | Instance UID; must both be set or both empty. |
| s2iMode | no | build (default) or plan (analyze only). |
| compositionRef | no | Override Crossplane composition name (advanced). |
| compositionSelector | no | compositionSelector.matchLabels (advanced). |

**Prerequisite:** Secret **ghcr-cred** in the target namespace with key **githubToken** (GitHub classic PAT). Scopes: repo (private repos); read:packages + write:packages.

**Response:** Task name, namespace, and underlying Job name (best-effort within a short poll).`

	huma.Register(grp, huma.Operation{
		OperationID: "task-s2i",
		Method:      http.MethodPost,
		Path:        "/s2i",
		Summary:     "Create S2I Task",
		Description: s2iCreateDescription,
		Tags:        []string{"Task"},
	}, func(ctx context.Context, input *s2iInput) (*s2iOutput, error) {
		restConfig, cfg, err := middleware.RestConfigFromAuth(input.Authorization)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid kubeconfig", err)
		}
		if input.Body.RepoURL == "" {
			return nil, huma.Error400BadRequest("repoUrl is required", nil)
		}

		mode := strings.TrimSpace(strings.ToLower(input.Body.S2IMode))
		if mode != "" && mode != "build" && mode != "plan" {
			return nil, huma.Error400BadRequest("s2iMode must be build or plan", nil)
		}
		pn := strings.TrimSpace(input.Body.ProjectName)
		pu := strings.TrimSpace(input.Body.ProjectUID)
		if (pn != "") != (pu != "") {
			return nil, huma.Error400BadRequest("projectName and projectUid must both be set or both empty", nil)
		}
		if input.Body.CompositionRef != "" && input.Body.CompositionSelector != nil && len(input.Body.CompositionSelector.MatchLabels) > 0 {
			return nil, huma.Error400BadRequest("set either compositionRef or compositionSelector, not both", nil)
		}

		gvr := middleware.PodsGVR()
		resolved, err := middleware.ResolveContext(cfg, middleware.ResolveOptions{
			Namespace:        input.Body.Namespace,
			AllNamespaces:    false,
			DefaultNamespace: "default",
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}
		ns := resolved.Namespace
		if ns == "" {
			ns = "default"
		}

		_, err = k8ssvc.Get(cfg, k8ssvc.GetOptions{
			Resource:  "secrets",
			Name:      "ghcr-cred",
			Namespace: ns,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error400BadRequest("secret ghcr-cred not found in namespace "+ns+": GitHub token secret is required for S2I build (Secret `ghcr-cred` with key `githubToken`)", nil)
			}
			return nil, huma.Error500InternalServerError("failed to check ghcr-cred secret", err)
		}

		var taskName string
		if raw := strings.TrimSpace(input.Body.Name); raw != "" {
			if errs := validation.IsDNS1123Subdomain(raw); len(errs) > 0 {
				return nil, huma.Error400BadRequest("invalid name: must be a valid DNS subdomain label (lowercase alphanumeric or hyphen, max 63 characters)", nil)
			}
			taskName = raw
		} else {
			suffix, genErr := nanoid4()
			if genErr != nil {
				return nil, huma.Error500InternalServerError("failed to generate task id", genErr)
			}
			baseName := repoNameFromURL(input.Body.RepoURL)
			taskName = baseName + "-" + suffix
		}

		spec := map[string]interface{}{
			"name":    taskName,
			"repoUrl": input.Body.RepoURL,
		}
		if strings.TrimSpace(input.Body.BuilderImage) != "" {
			spec["builderImage"] = strings.TrimSpace(input.Body.BuilderImage)
		}
		if strings.TrimSpace(input.Body.OutputVolumeSize) != "" {
			spec["outputVolumeSize"] = strings.TrimSpace(input.Body.OutputVolumeSize)
		}
		if pn != "" {
			spec["projectName"] = pn
			spec["projectUid"] = pu
		}
		if mode != "" {
			spec["s2iMode"] = mode
		}

		cpx := map[string]interface{}{}
		if ref := strings.TrimSpace(input.Body.CompositionRef); ref != "" {
			cpx["compositionRef"] = map[string]interface{}{"name": ref}
		}
		if sel := input.Body.CompositionSelector; sel != nil && len(sel.MatchLabels) > 0 {
			cpx["compositionSelector"] = map[string]interface{}{"matchLabels": sel.MatchLabels}
		}
		if len(cpx) > 0 {
			spec["crossplane"] = cpx
		}

		task := map[string]interface{}{
			"apiVersion": taskAPIVersion,
			"kind":       taskKind,
			"metadata": map[string]interface{}{
				"name":      taskName,
				"namespace": ns,
			},
			"spec": spec,
		}
		yamlBytes, err := yaml.Marshal(task)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to build task manifest", err)
		}

		if err := k8ssvc.ApplyYAML(restConfig, yamlBytes, ns); err != nil {
			return nil, huma.Error500InternalServerError("failed to apply task", err)
		}

		// Wait briefly for Crossplane to create the composed Job so we can return its name.
		clientset, err := kubernetes.NewForConfig(restConfig)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to create k8s client", err)
		}
		jobName := ""
		deadline := time.Now().Add(3 * time.Second)
		for time.Now().Before(deadline) {
			jobs, listErr := clientset.BatchV1().Jobs(ns).List(ctx, metav1.ListOptions{
				LabelSelector: "crossplane.io/composite=" + taskName,
			})
			if listErr == nil && len(jobs.Items) > 0 {
				latest := jobs.Items[0]
				for i := 1; i < len(jobs.Items); i++ {
					if jobs.Items[i].CreationTimestamp.After(latest.CreationTimestamp.Time) {
						latest = jobs.Items[i]
					}
				}
				jobName = latest.Name
				break
			}
			time.Sleep(300 * time.Millisecond)
		}
		if jobName == "" {
			return nil, huma.Error409Conflict("task created but underlying Job is not ready yet; retry shortly", nil)
		}

		return &s2iOutput{
			Body: struct {
				Name      string `json:"name" doc:"Task resource name"`
				Namespace string `json:"namespace" doc:"Namespace the Task was created in"`
				JobName   string `json:"jobName" doc:"Underlying Kubernetes Job name spawned by Crossplane for this task"`
			}{
				Name:      taskName,
				Namespace: ns,
				JobName:   jobName,
			},
		}, nil
	})
}

// s2iResultConfigMapName returns the result ConfigMap name for a completed S2I Job.
// The composition names it <jobName>-s2i-result (Job is <task>-<suffix>); legacy tasks used <taskName>-s2i-result.
func s2iResultConfigMapName(taskName, jobName string) string {
	if jobName != "" {
		return fmt.Sprintf("%s-s2i-result", jobName)
	}
	return fmt.Sprintf("%s-s2i-result", taskName)
}

// taskStatusFromUnstructured fills phase / job fields from a Task CRD JSON object (status map).
func taskStatusFromUnstructured(obj map[string]interface{}) (
	phase, jobName, startTime, completionTime, duration string,
	succeeded *int,
	conditions any,
) {
	statusObj, _ := obj["status"].(map[string]interface{})
	if statusObj == nil {
		return "Pending", "", "", "", "", nil, nil
	}
	if v, ok := statusObj["phase"].(string); ok && v != "" {
		phase = v
	} else {
		phase = "Pending"
	}
	if v, ok := statusObj["jobName"].(string); ok {
		jobName = v
	}
	if v, ok := statusObj["startTime"].(string); ok {
		startTime = v
	}
	if v, ok := statusObj["completionTime"].(string); ok {
		completionTime = v
	}
	if v, ok := statusObj["succeeded"]; ok && v != nil {
		switch n := v.(type) {
		case float64:
			i := int(n)
			succeeded = &i
		case int:
			succeeded = &n
		}
	}
	if v, ok := statusObj["duration"].(string); ok {
		duration = v
	}
	if v, ok := statusObj["conditions"]; ok {
		conditions = v
	}
	return phase, jobName, startTime, completionTime, duration, succeeded, conditions
}

func parseS2IResultConfigMap(cmJSON []byte, cmName string) (s2iResultPayload, error) {
	var out s2iResultPayload
	out.ConfigMapName = cmName
	var cm corev1.ConfigMap
	if err := json.Unmarshal(cmJSON, &cm); err != nil {
		return out, err
	}
	if v := cm.Data["s2i.mode"]; v != "" {
		out.S2IMode = v
	}
	if v := cm.Data["deployed-ap-name"]; v != "" {
		out.DeployedApName = v
	}
	if raw := cm.BinaryData["plan.json"]; len(raw) > 0 {
		if json.Valid(raw) {
			out.Plan = json.RawMessage(raw)
		}
	}
	if raw := cm.BinaryData["info.json"]; len(raw) > 0 {
		if json.Valid(raw) {
			out.Info = json.RawMessage(raw)
		}
	}
	if raw := cm.BinaryData["built-images.txt"]; len(raw) > 0 {
		out.Images = strings.Fields(strings.TrimSpace(string(raw)))
	}
	if raw := cm.BinaryData["metrics.json"]; len(raw) > 0 && json.Valid(raw) {
		out.Metrics = json.RawMessage(raw)
	}
	return out, nil
}

type s2iResultPayload struct {
	ConfigMapName  string          `json:"configMapName"`
	S2IMode        string          `json:"s2iMode,omitempty"`
	Plan           json.RawMessage `json:"plan,omitempty"`
	Info           json.RawMessage `json:"info,omitempty" doc:"Railpack build info (binaryData info.json, from railpack-info.json)"`
	Images         []string        `json:"images,omitempty"`
	DeployedApName string          `json:"deployedApName,omitempty"`
	Metrics        json.RawMessage `json:"metrics,omitempty" doc:"Task inputs and per-stage durations (from binaryData metrics.json)"`
}

func registerS2iGet(grp huma.API) {
	type s2iGetInput struct {
		middleware.AuthInput
		Name      string `query:"name" required:"true" doc:"Task resource name"`
		Namespace string `query:"namespace" doc:"Target namespace (admin kubeconfig only)"`
	}
	type s2iGetBody struct {
		Phase          string            `json:"phase" doc:"Pending, Running, Complete, or Failed"`
		JobName        string            `json:"jobName,omitempty" doc:"Underlying Job name"`
		StartTime      string            `json:"startTime,omitempty"`
		CompletionTime string            `json:"completionTime,omitempty"`
		Succeeded      *int              `json:"succeeded,omitempty" doc:"1 when the Job completed successfully"`
		Duration       string            `json:"duration,omitempty"`
		Conditions     any               `json:"conditions,omitempty"`
		Result         *s2iResultPayload `json:"result,omitempty" doc:"Populated when phase is Complete and ConfigMap <jobName>-s2i-result exists"`
	}
	type s2iGetOutput struct {
		Body s2iGetBody
	}

	huma.Register(grp, huma.Operation{
		OperationID: "task-s2i-get",
		Method:      http.MethodGet,
		Path:        "/s2i",
		Summary:     "Get S2I Task status and result",
		Description: "Returns the Crossplane Task status (phase, jobName, times, conditions). When `phase` is `Complete`, loads ConfigMap `<jobName>-s2i-result` (same name prefix as the Kubernetes Job; owned by the Task, so it is removed when the Task is deleted) and returns `result` with railpack `plan` and `info` JSON, `metrics` (inputs + stage timestamps/durations), built image refs, and deployed AP name when present.",
		Tags:        []string{"Task"},
	}, func(ctx context.Context, input *s2iGetInput) (*s2iGetOutput, error) {
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
			DefaultNamespace: "default",
			AdminCheckGVR:    &gvr,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to resolve request context", err)
		}
		ns := resolved.Namespace
		if ns == "" {
			ns = "default"
		}

		taskJSON, err := k8ssvc.Get(cfg, k8ssvc.GetOptions{
			Resource:  "tasks",
			Name:      input.Name,
			Namespace: ns,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return nil, huma.Error404NotFound("task not found", err)
			}
			return nil, huma.Error500InternalServerError("failed to get task", err)
		}

		var taskObj map[string]interface{}
		if err := json.Unmarshal(taskJSON, &taskObj); err != nil {
			return nil, huma.Error500InternalServerError("failed to parse task", err)
		}

		phase, jobName, startTime, completionTime, duration, succeeded, conditions := taskStatusFromUnstructured(taskObj)

		out := &s2iGetOutput{
			Body: s2iGetBody{
				Phase:          phase,
				JobName:        jobName,
				StartTime:      startTime,
				CompletionTime: completionTime,
				Succeeded:      succeeded,
				Duration:       duration,
				Conditions:     conditions,
			},
		}

		if phase != "Complete" {
			return out, nil
		}

		cmName := s2iResultConfigMapName(input.Name, jobName)
		cmJSON, err := k8ssvc.Get(cfg, k8ssvc.GetOptions{
			Resource:  "configmaps",
			Name:      cmName,
			Namespace: ns,
		})
		if err != nil {
			if apierrors.IsNotFound(err) {
				return out, nil
			}
			return nil, huma.Error500InternalServerError("failed to get s2i result ConfigMap", err)
		}

		payload, err := parseS2IResultConfigMap(cmJSON, cmName)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to parse s2i result ConfigMap", err)
		}
		out.Body.Result = &payload
		return out, nil
	})
}
