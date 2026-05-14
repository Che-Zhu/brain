package db

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestDBXRDIncludesLifecycleFields(t *testing.T) {
	root := repoRoot(t)
	raw, err := os.ReadFile(filepath.Join(root, "packages/crossplane/public/service/db/db.yaml"))
	if err != nil {
		t.Fatalf("read DB XRD: %v", err)
	}

	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse DB XRD: %v", err)
	}

	specProps := xrdSpecProperties(t, doc)
	paused := asMap(t, specProps["paused"], "spec.paused")
	if got := paused["type"]; got != "boolean" {
		t.Fatalf("spec.paused type = %v, want boolean", got)
	}
	if got := paused["default"]; got != false {
		t.Fatalf("spec.paused default = %v, want false", got)
	}

	restartRequest := asMap(t, specProps["restartRequest"], "spec.restartRequest")
	if got := restartRequest["type"]; got != "integer" {
		t.Fatalf("spec.restartRequest type = %v, want integer", got)
	}
	if got := restartRequest["default"]; !isZeroNumber(got) {
		t.Fatalf("spec.restartRequest default = %v, want 0", got)
	}
	if got := restartRequest["minimum"]; !isZeroNumber(got) {
		t.Fatalf("spec.restartRequest minimum = %v, want 0", got)
	}
}

func TestDBCompositionsRenderPauseAndRestartLifecycle(t *testing.T) {
	root := repoRoot(t)
	cases := map[string][]string{
		"dbs-mongodb-kubeblocks-go-templating.yaml": {
			"{{- if $paused }}{{- $desiredReplicas = 0 }}{{- end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: mongodb",
			"phase: {{ if $paused }}Paused{{ else }}{{ $kbCluster.status.phase | default \"Unknown\" }}{{ end }}",
		},
		"dbs-mysql-kubeblocks-go-templating.yaml": {
			"{{- if $paused }}{{- $desiredReplicas = 0 }}{{- end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: mysql",
			"phase: {{ if $paused }}Paused{{ else }}{{ $kbCluster.status.phase | default \"Unknown\" }}{{ end }}",
		},
		"dbs-postgresql-kubeblocks-go-templating.yaml": {
			"{{ if $paused }}{{ $desiredReplicas = 0 }}{{ end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: postgresql",
			"phase: {{ if $paused }}Paused{{ else }}{{ $kbCluster.status.phase | default \"Unknown\" }}{{ end }}",
		},
		"dbs-redis-kubeblocks-go-templating.yaml": {
			"{{- if $paused }}{{- $desiredReplicas = 0 }}{{- end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: redis",
			"phase: {{ if $paused }}Paused{{ else }}{{ $kbCluster.status.phase | default \"Unknown\" }}{{ end }}",
		},
	}

	for file, fragments := range cases {
		t.Run(file, func(t *testing.T) {
			template := compositionTemplate(t, filepath.Join(root, "packages/crossplane/public/service/db", file))
			for _, fragment := range fragments {
				if !strings.Contains(template, fragment) {
					t.Fatalf("expected composition template to contain %q", fragment)
				}
			}
		})
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
	spec := asMap(t, doc["spec"], "spec")
	versions := asSlice(t, spec["versions"], "spec.versions")
	if len(versions) == 0 {
		t.Fatal("spec.versions is empty")
	}
	version := asMap(t, versions[0], "spec.versions[0]")
	schema := asMap(t, version["schema"], "spec.versions[0].schema")
	openAPI := asMap(t, schema["openAPIV3Schema"], "openAPIV3Schema")
	rootProps := asMap(t, openAPI["properties"], "openAPIV3Schema.properties")
	specSchema := asMap(t, rootProps["spec"], "openAPIV3Schema.properties.spec")
	return asMap(t, specSchema["properties"], "openAPIV3Schema.properties.spec.properties")
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

func isZeroNumber(value interface{}) bool {
	switch v := value.(type) {
	case int:
		return v == 0
	case int64:
		return v == 0
	case float64:
		return v == 0
	default:
		return false
	}
}
