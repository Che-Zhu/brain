package db

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

	statusProps := xrdStatusProperties(t, doc)
	phase := asMap(t, statusProps["phase"], "status.phase")
	assertStringSliceEqual(t, asStringSlice(t, phase["enum"], "status.phase.enum"), []string{
		"Creating",
		"Running",
		"Updating",
		"Restarting",
		"Stopping",
		"Paused",
		"Starting",
		"Failed",
		"Deleting",
		"Unknown",
	})
	reason := asMap(t, statusProps["reason"], "status.reason")
	if got := reason["type"]; got != "string" {
		t.Fatalf("status.reason type = %v, want string", got)
	}
	mountPath := asMap(t, statusProps["mountPath"], "status.mountPath")
	if got := mountPath["type"]; got != "string" {
		t.Fatalf("status.mountPath type = %v, want string", got)
	}
	effectiveResources := asMap(t, statusProps["effectiveResources"], "status.effectiveResources")
	if got := effectiveResources["type"]; got != "object" {
		t.Fatalf("status.effectiveResources type = %v, want object", got)
	}
	effectiveResourceProps := asMap(t, effectiveResources["properties"], "status.effectiveResources.properties")
	for _, field := range []string{"cpuRequest", "memoryRequest", "cpuLimit", "memoryLimit", "storageSize"} {
		prop := asMap(t, effectiveResourceProps[field], "status.effectiveResources."+field)
		if got := prop["type"]; got != "string" {
			t.Fatalf("status.effectiveResources.%s type = %v, want string", field, got)
		}
	}
	observed := asMap(t, statusProps["observed"], "status.observed")
	observedProps := asMap(t, observed["properties"], "status.observed.properties")
	for _, field := range []string{"kubeblocksPhase", "observedReplicas", "availableReplicas"} {
		if _, ok := observedProps[field]; !ok {
			t.Fatalf("status.observed.%s is missing", field)
		}
	}
	lifecycle := asMap(t, statusProps["lifecycle"], "status.lifecycle")
	lifecycleProps := asMap(t, lifecycle["properties"], "status.lifecycle.properties")
	everReady := asMap(t, lifecycleProps["everReady"], "status.lifecycle.everReady")
	if got := everReady["type"]; got != "boolean" {
		t.Fatalf("status.lifecycle.everReady type = %v, want boolean", got)
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
			"phase: {{ $productPhase }}",
		},
		"dbs-mysql-kubeblocks-go-templating.yaml": {
			"{{- if $paused }}{{- $desiredReplicas = 0 }}{{- end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: mysql",
			"phase: {{ $productPhase }}",
		},
		"dbs-postgresql-kubeblocks-go-templating.yaml": {
			"{{ if $paused }}{{ $desiredReplicas = 0 }}{{ end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: postgresql",
			"phase: {{ $productPhase }}",
		},
		"dbs-redis-kubeblocks-go-templating.yaml": {
			"{{- if $paused }}{{- $desiredReplicas = 0 }}{{- end }}",
			"replicas: {{ $desiredReplicas }}",
			"name: {{ printf \"%s-restart-%d\" $name $restartRequest }}",
			"componentName: redis",
			"phase: {{ $productPhase }}",
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

func TestDBCompositionsRenderProductLifecyclePhase(t *testing.T) {
	root := repoRoot(t)
	files := []string{
		"dbs-mongodb-kubeblocks-go-templating.yaml",
		"dbs-mysql-kubeblocks-go-templating.yaml",
		"dbs-postgresql-kubeblocks-go-templating.yaml",
		"dbs-redis-kubeblocks-go-templating.yaml",
	}

	for _, file := range files {
		t.Run(file, func(t *testing.T) {
			template := compositionTemplate(t, filepath.Join(root, "packages/crossplane/public/service/db", file))
			for _, fragment := range []string{
				`{{ $productPhase := "Unknown" }}`,
				`{{ $reason := $kbPhase | default "Waiting" }}`,
				`{{ if $deleting }}`,
				`{{ else if eq $restartOpsType "Restart" }}`,
				`{{ else if or (eq $restartOpsPhase "Failed") (eq $kbPhase "Failed") (eq $kbPhase "Abnormal") (eq $kbPhase "Degraded") }}`,
				`{{ else if and $paused (gt $availableReplicas 0) }}`,
				`{{ else if $paused }}`,
				`{{ else if or (eq $kbPhase "Updating") (eq $kbPhase "SpecUpdating") (eq $kbPhase "Upgrade") (eq $kbPhase "VerticalScaling") (eq $kbPhase "VolumeExpanding") }}`,
				`phase: {{ $productPhase }}`,
				`reason: {{ $reason | quote }}`,
				`kind: StatefulSet`,
				`volumeMounts`,
				`mountPath: {{ $mountPath | quote }}`,
				`effectiveResources:`,
				`cpuRequest: {{ $cpu | quote }}`,
				`memoryRequest: {{ $mem | quote }}`,
				`cpuLimit: {{ $cpuLim | quote }}`,
				`memoryLimit: {{ $memLim | quote }}`,
				`storageSize: {{ $stor | quote }}`,
				`observed:`,
				`kubeblocksPhase: {{ $kbPhase | quote }}`,
				`lifecycle:`,
				`everReady: {{ $everReady }}`,
			} {
				if !strings.Contains(template, fragment) {
					t.Fatalf("expected composition template to contain %q", fragment)
				}
			}
			if strings.Contains(template, `phase: {{ if $paused }}Paused{{ else }}{{ $kbCluster.status.phase | default "Unknown" }}{{ end }}`) {
				t.Fatal("composition still passes through KubeBlocks phase instead of product lifecycle phase")
			}
		})
	}
}

func TestDBCompositionsTemplatesParse(t *testing.T) {
	root := repoRoot(t)
	files := []string{
		"dbs-mongodb-kubeblocks-go-templating.yaml",
		"dbs-mysql-kubeblocks-go-templating.yaml",
		"dbs-postgresql-kubeblocks-go-templating.yaml",
		"dbs-redis-kubeblocks-go-templating.yaml",
	}
	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(interface{}, string) map[string]interface{} {
		return nil
	}

	for _, file := range files {
		t.Run(file, func(t *testing.T) {
			templateText := compositionTemplate(t, filepath.Join(root, "packages/crossplane/public/service/db", file))
			if _, err := template.New(file).Funcs(funcs).Parse(templateText); err != nil {
				t.Fatalf("parse composition template: %v", err)
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

func asStringSlice(t *testing.T, value interface{}, path string) []string {
	t.Helper()
	raw := asSlice(t, value, path)
	out := make([]string, 0, len(raw))
	for i, item := range raw {
		s, ok := item.(string)
		if !ok {
			t.Fatalf("%s[%d] is %T, want string", path, i, item)
		}
		out = append(out, s)
	}
	return out
}

func assertStringSliceEqual(t *testing.T, got []string, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("unexpected string slice length\nwant: %#v\n got: %#v", want, got)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("unexpected string slice\nwant: %#v\n got: %#v", want, got)
		}
	}
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
