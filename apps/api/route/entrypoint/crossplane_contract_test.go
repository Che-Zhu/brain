package entrypoint

import (
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
