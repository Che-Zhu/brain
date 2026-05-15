package entrypoint

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"text/template"

	"github.com/Masterminds/sprig/v3"
	"sigs.k8s.io/yaml"
)

func TestEntryPointXRDIncludesPublicAccessContract(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/service/entrypoint/entrypoint.yaml"))
	if err != nil {
		t.Fatalf("read EntryPoint XRD: %v", err)
	}

	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse EntryPoint XRD: %v", err)
	}

	specProps := xrdSpecProperties(t, doc)
	apRef := asMap(t, specProps["apRef"], "spec.apRef")
	if got := apRef["type"]; got != "string" {
		t.Fatalf("spec.apRef type = %v, want string", got)
	}

	targets := asMap(t, specProps["targets"], "spec.targets")
	if got := targets["type"]; got != "array" {
		t.Fatalf("spec.targets type = %v, want array", got)
	}
	targetItemProps := asMap(t, asMap(t, targets["items"], "spec.targets.items")["properties"], "spec.targets.items.properties")
	for _, field := range []string{"port", "platformDomain", "status"} {
		if _, ok := targetItemProps[field]; !ok {
			t.Fatalf("spec.targets.items.%s is missing", field)
		}
	}

	customDomains := asMap(t, specProps["customDomains"], "spec.customDomains")
	if got := customDomains["type"]; got != "array" {
		t.Fatalf("spec.customDomains type = %v, want array", got)
	}

	statusProps := xrdStatusProperties(t, doc)
	phase := asMap(t, statusProps["phase"], "status.phase")
	if got := phase["type"]; got != "string" {
		t.Fatalf("status.phase type = %v, want string", got)
	}
	statusTargets := asMap(t, statusProps["targets"], "status.targets")
	if got := statusTargets["type"]; got != "array" {
		t.Fatalf("status.targets type = %v, want array", got)
	}
}

func TestEntryPointMinimalCompositionSurfacesAggregateStatus(t *testing.T) {
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/entrypoint/entrypoints-minimal-composition.yaml"))

	for _, fragment := range []string{
		`{{- $phase := "Not configured" }}`,
		`{{- if $allOk }}{{ $phase = "Accessible" }}`,
		`{{- else if $anyFail }}{{ $phase = "Inaccessible" }}`,
		`{{- else if $anyProg }}{{ $phase = "Progressing" }}`,
		`kind: EntryPoint`,
		`phase: {{ $phase | quote }}`,
		`targets:`,
		`platformDomain: {{ .platformDomain | quote }}`,
	} {
		if !strings.Contains(templateText, fragment) {
			t.Fatalf("expected EntryPoint composition template to contain %q", fragment)
		}
	}

	if _, err := template.New("entrypoints-minimal").Funcs(sprig.TxtFuncMap()).Parse(templateText); err != nil {
		t.Fatalf("parse EntryPoint composition template: %v", err)
	}
}

func TestAPCompositionRendersEntryPointForPublicTargets(t *testing.T) {
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/aps-deployment-ingress-go-templating.yaml"))

	for _, fragment := range []string{
		`composition-resource-name: app-entrypoint`,
		`kind: EntryPoint`,
		`apRef: {{ $name | quote }}`,
		`targets:`,
		`{{ range $endpoints }}`,
		`{{ if and .public (ne (trim (toString (default "" .host))) "") }}`,
		`platformDomain: {{ trim (toString .host) | quote }}`,
		`status: {{ $entryTargetStatus | quote }}`,
	} {
		if !strings.Contains(templateText, fragment) {
			t.Fatalf("expected AP composition template to contain %q", fragment)
		}
	}

	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(interface{}, string) map[string]interface{} {
		return nil
	}
	funcs["toYaml"] = func(v interface{}) string {
		raw, _ := yaml.Marshal(v)
		return string(raw)
	}
	if _, err := template.New("aps-deployment-ingress").Funcs(funcs).Parse(templateText); err != nil {
		t.Fatalf("parse AP composition template: %v", err)
	}
}

func TestAPCompositionCreatesEntryPointForPublicAPEndpoints(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": map[string]interface{}{
					"metadata": map[string]interface{}{
						"labels": map[string]interface{}{
							"region": "usw.sealos.app",
						},
						"name":      "web",
						"namespace": "project-a",
						"uid":       "ap-uid-1",
					},
					"spec": map[string]interface{}{
						"image": "nginx:1.27",
						"endpoints": []interface{}{
							map[string]interface{}{"port": 80},
							map[string]interface{}{"port": 8080},
							map[string]interface{}{"port": 9000, "public": false},
						},
					},
				},
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	entryPointObject := singleEntryPointObject(t, out)
	assertManagementPolicies(t, entryPointObject, "Observe", "Create", "Update")
	entryPoint := manifestFromObject(t, entryPointObject, "entrypoint object")
	metadata := asMap(t, entryPoint["metadata"], "entrypoint.metadata")
	if got := metadata["name"]; got != "web" {
		t.Fatalf("EntryPoint metadata.name = %v, want web", got)
	}
	if got := metadata["namespace"]; got != "project-a" {
		t.Fatalf("EntryPoint metadata.namespace = %v, want project-a", got)
	}

	spec := asMap(t, entryPoint["spec"], "entrypoint.spec")
	if got := spec["apRef"]; got != "web" {
		t.Fatalf("EntryPoint spec.apRef = %v, want web", got)
	}
	targets := asSlice(t, spec["targets"], "entrypoint.spec.targets")
	if got := len(targets); got != 2 {
		t.Fatalf("EntryPoint target count = %d, want 2", got)
	}

	targetByPort := map[int]map[string]interface{}{}
	for i, target := range targets {
		targetMap := asMap(t, target, fmt.Sprintf("entrypoint.spec.targets[%d]", i))
		targetByPort[numberAsInt(t, targetMap["port"], fmt.Sprintf("entrypoint.spec.targets[%d].port", i))] = targetMap
	}
	for _, port := range []int{80, 8080} {
		target, ok := targetByPort[port]
		if !ok {
			t.Fatalf("missing EntryPoint target for public AP endpoint port %d", port)
		}
		domain, ok := target["platformDomain"].(string)
		if !ok {
			t.Fatalf("target %d platformDomain is %T, want string", port, target["platformDomain"])
		}
		if wantPrefix := fmt.Sprintf("web-p%d-", port); !strings.HasPrefix(domain, wantPrefix) {
			t.Fatalf("target %d platformDomain = %q, want prefix %q", port, domain, wantPrefix)
		}
		if !strings.HasSuffix(domain, ".usw.sealos.app") {
			t.Fatalf("target %d platformDomain = %q, want usw.sealos.app suffix", port, domain)
		}
		if got := target["status"]; got != "accessible" {
			t.Fatalf("target %d status = %v, want accessible", port, got)
		}
	}
	if _, ok := targetByPort[9000]; ok {
		t.Fatal("EntryPoint included internal-only AP endpoint port 9000")
	}
}

func TestAPCompositionOmitsEntryPointWithoutPublicPlatformHostname(t *testing.T) {
	tests := []struct {
		name string
		ap   map[string]interface{}
	}{
		{
			name: "internal endpoints only",
			ap: apResource(map[string]interface{}{
				"endpoints": []interface{}{
					map[string]interface{}{"port": 80, "public": false},
				},
			}, map[string]interface{}{
				"region": "usw.sealos.app",
			}),
		},
		{
			name: "public endpoint without resolved host",
			ap: apResource(map[string]interface{}{
				"endpoints": []interface{}{
					map[string]interface{}{"host": "  ", "port": 80, "public": true},
				},
			}, nil),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			out := renderAPComposition(t, map[string]interface{}{
				"observed": map[string]interface{}{
					"composite": map[string]interface{}{
						"resource": tt.ap,
					},
				},
			}, map[string]map[string]interface{}{
				"app-deployment": runningDeployment(),
			})

			if got := entryPointObjects(t, out); len(got) != 0 {
				t.Fatalf("EntryPoint manifest count = %d, want 0", len(got))
			}
		})
	}
}

func TestProviderKubernetesRBACAllowsEntryPointWrites(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/provider-kubernetes-rbac.yaml"))
	if err != nil {
		t.Fatalf("read provider-kubernetes RBAC: %v", err)
	}
	text := string(raw)
	for _, fragment := range []string{
		`resources: ["entrypoints"]`,
		`verbs: ["get", "list", "watch", "create", "update", "patch"]`,
	} {
		if !strings.Contains(text, fragment) {
			t.Fatalf("expected provider-kubernetes RBAC to contain %q", fragment)
		}
	}
}

func repoRoot(t *testing.T) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(currentFile), "../../../.."))
}

func apResource(spec map[string]interface{}, labels map[string]interface{}) map[string]interface{} {
	metadata := map[string]interface{}{
		"name":      "web",
		"namespace": "project-a",
		"uid":       "ap-uid-1",
	}
	if labels != nil {
		metadata["labels"] = labels
	}
	fullSpec := map[string]interface{}{
		"image": "nginx:1.27",
	}
	for key, value := range spec {
		fullSpec[key] = value
	}
	return map[string]interface{}{
		"metadata": metadata,
		"spec":     fullSpec,
	}
}

func renderAPComposition(t *testing.T, data map[string]interface{}, composed map[string]map[string]interface{}) string {
	t.Helper()
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/aps-deployment-ingress-go-templating.yaml"))
	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(_ interface{}, name string) map[string]interface{} {
		return composed[name]
	}
	funcs["toYaml"] = func(v interface{}) string {
		raw, err := yaml.Marshal(v)
		if err != nil {
			t.Fatalf("marshal template value as YAML: %v", err)
		}
		return string(raw)
	}

	tpl, err := template.New("aps-deployment-ingress").Funcs(funcs).Parse(templateText)
	if err != nil {
		t.Fatalf("parse AP composition template: %v", err)
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		t.Fatalf("execute AP composition template: %v", err)
	}
	return buf.String()
}

func runningDeployment() map[string]interface{} {
	return map[string]interface{}{
		"status": map[string]interface{}{
			"conditions": []interface{}{
				map[string]interface{}{"status": "True", "type": "Available"},
				map[string]interface{}{"reason": "NewReplicaSetAvailable", "status": "True", "type": "Progressing"},
			},
		},
	}
}

func singleEntryPointObject(t *testing.T, output string) map[string]interface{} {
	t.Helper()
	objects := entryPointObjects(t, output)
	if got := len(objects); got != 1 {
		t.Fatalf("EntryPoint object count = %d, want 1", got)
	}
	return objects[0]
}

func entryPointObjects(t *testing.T, output string) []map[string]interface{} {
	t.Helper()
	var objects []map[string]interface{}
	for i, doc := range strings.Split(output, "\n---") {
		doc = strings.TrimSpace(doc)
		if doc == "" {
			continue
		}
		var obj map[string]interface{}
		if err := yaml.Unmarshal([]byte(doc), &obj); err != nil {
			t.Fatalf("parse rendered YAML document %d: %v\n%s", i, err, doc)
		}
		if obj["kind"] != "Object" {
			continue
		}
		manifest := manifestFromObject(t, obj, fmt.Sprintf("rendered[%d]", i))
		if manifest["kind"] == "EntryPoint" {
			objects = append(objects, obj)
		}
	}
	return objects
}

func manifestFromObject(t *testing.T, obj map[string]interface{}, path string) map[string]interface{} {
	t.Helper()
	spec := asMap(t, obj["spec"], path+".spec")
	forProvider := asMap(t, spec["forProvider"], path+".spec.forProvider")
	return asMap(t, forProvider["manifest"], path+".spec.forProvider.manifest")
}

func assertManagementPolicies(t *testing.T, obj map[string]interface{}, want ...string) {
	t.Helper()
	spec := asMap(t, obj["spec"], "entrypoint object.spec")
	policies := asSlice(t, spec["managementPolicies"], "entrypoint object.spec.managementPolicies")
	got := map[string]bool{}
	for _, policy := range policies {
		name, ok := policy.(string)
		if !ok {
			t.Fatalf("management policy is %T, want string", policy)
		}
		got[name] = true
	}
	for _, policy := range want {
		if !got[policy] {
			t.Fatalf("missing EntryPoint Object management policy %q in %v", policy, policies)
		}
	}
}

func numberAsInt(t *testing.T, value interface{}, path string) int {
	t.Helper()
	switch v := value.(type) {
	case int:
		return v
	case float64:
		return int(v)
	default:
		t.Fatalf("%s is %T, want number", path, value)
		return 0
	}
}

func xrdSpecProperties(t *testing.T, doc map[string]interface{}) map[string]interface{} {
	t.Helper()
	rootProps := xrdOpenAPIProperties(t, doc)
	specSchema := asMap(t, rootProps["spec"], "openAPIV3Schema.properties.spec")
	return asMap(t, specSchema["properties"], "openAPIV3Schema.properties.spec.properties")
}

func xrdStatusProperties(t *testing.T, doc map[string]interface{}) map[string]interface{} {
	t.Helper()
	rootProps := xrdOpenAPIProperties(t, doc)
	statusSchema := asMap(t, rootProps["status"], "openAPIV3Schema.properties.status")
	return asMap(t, statusSchema["properties"], "openAPIV3Schema.properties.status.properties")
}

func xrdOpenAPIProperties(t *testing.T, doc map[string]interface{}) map[string]interface{} {
	t.Helper()
	spec := asMap(t, doc["spec"], "spec")
	versions := asSlice(t, spec["versions"], "spec.versions")
	if len(versions) == 0 {
		t.Fatal("spec.versions is empty")
	}
	version := asMap(t, versions[0], "spec.versions[0]")
	schema := asMap(t, version["schema"], "spec.versions[0].schema")
	openAPI := asMap(t, schema["openAPIV3Schema"], "openAPIV3Schema")
	return asMap(t, openAPI["properties"], "openAPIV3Schema.properties")
}

func compositionTemplate(t *testing.T, path string) string {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read composition %s: %v", path, err)
	}
	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse composition %s: %v", path, err)
	}
	spec := asMap(t, doc["spec"], "spec")
	pipeline := asSlice(t, spec["pipeline"], "spec.pipeline")
	if len(pipeline) == 0 {
		t.Fatal("spec.pipeline is empty")
	}
	step := asMap(t, pipeline[0], "spec.pipeline[0]")
	input := asMap(t, step["input"], "spec.pipeline[0].input")
	inline := asMap(t, input["inline"], "spec.pipeline[0].input.inline")
	template, ok := inline["template"].(string)
	if !ok {
		t.Fatal("spec.pipeline[0].input.inline.template is not a string")
	}
	return template
}

func asMap(t *testing.T, value interface{}, path string) map[string]interface{} {
	t.Helper()
	m, ok := value.(map[string]interface{})
	if !ok {
		t.Fatalf("%s is %T, want map[string]interface{}", path, value)
	}
	return m
}

func asSlice(t *testing.T, value interface{}, path string) []interface{} {
	t.Helper()
	s, ok := value.([]interface{})
	if !ok {
		t.Fatalf("%s is %T, want []interface{}", path, value)
	}
	return s
}
