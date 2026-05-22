package ap

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestAPXRDIncludesNetworkContract(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/ap.yaml"))
	if err != nil {
		t.Fatalf("read AP XRD: %v", err)
	}

	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse AP XRD: %v", err)
	}

	specProps := xrdSpecProperties(t, doc)
	input := asMap(t, specProps["input"], "spec.input")
	inputProps := asMap(t, input["properties"], "spec.input.properties")
	network := asMap(t, inputProps["network"], "spec.input.network")
	networkProps := asMap(t, network["properties"], "spec.input.network.properties")
	privatePort := asMap(t, networkProps["privatePort"], "spec.input.network.privatePort")
	if got := privatePort["type"]; got != "integer" {
		t.Fatalf("privatePort type = %v, want integer", got)
	}
	if got := privatePort["minimum"]; got != float64(1) {
		t.Fatalf("privatePort minimum = %v, want 1", got)
	}
	if got := privatePort["maximum"]; got != float64(65535) {
		t.Fatalf("privatePort maximum = %v, want 65535", got)
	}
	publicAddresses := asMap(t, networkProps["publicAddresses"], "spec.input.network.publicAddresses")
	if got := publicAddresses["type"]; got != "array" {
		t.Fatalf("publicAddresses type = %v, want array", got)
	}
	publicAddressItem := asMap(t, publicAddresses["items"], "spec.input.network.publicAddresses.items")
	publicAddressRequired := asSlice(t, publicAddressItem["required"], "spec.input.network.publicAddresses.items.required")
	assertStringSliceContains(t, publicAddressRequired, "host")
	assertStringSliceContains(t, publicAddressRequired, "port")
	publicAddressProps := asMap(t, publicAddressItem["properties"], "spec.input.network.publicAddresses.items.properties")
	host := asMap(t, publicAddressProps["host"], "spec.input.network.publicAddresses.items.host")
	if got := host["type"]; got != "string" {
		t.Fatalf("publicAddresses host type = %v, want string", got)
	}
	publicPort := asMap(t, publicAddressProps["port"], "spec.input.network.publicAddresses.items.port")
	if got := publicPort["type"]; got != "integer" {
		t.Fatalf("publicAddresses port type = %v, want integer", got)
	}
	if got := publicPort["minimum"]; got != float64(1) {
		t.Fatalf("publicAddresses port minimum = %v, want 1", got)
	}
	if got := publicPort["maximum"]; got != float64(65535) {
		t.Fatalf("publicAddresses port maximum = %v, want 65535", got)
	}

	statusProps := xrdStatusProperties(t, doc)
	statusNetwork := asMap(t, statusProps["network"], "status.network")
	statusNetworkProps := asMap(t, statusNetwork["properties"], "status.network.properties")
	for _, field := range []string{"privateAddress", "privatePort"} {
		if _, ok := statusNetworkProps[field]; !ok {
			t.Fatalf("status.network.%s is missing", field)
		}
	}
	statusPublicAddresses := asMap(t, statusNetworkProps["publicAddresses"], "status.network.publicAddresses")
	if got := statusPublicAddresses["type"]; got != "array" {
		t.Fatalf("status.network.publicAddresses type = %v, want array", got)
	}
	statusPublicAddressItem := asMap(t, statusPublicAddresses["items"], "status.network.publicAddresses.items")
	statusPublicAddressProps := asMap(t, statusPublicAddressItem["properties"], "status.network.publicAddresses.items.properties")
	for _, field := range []string{"host", "url", "port", "type", "status"} {
		if _, ok := statusPublicAddressProps[field]; !ok {
			t.Fatalf("status.network.publicAddresses[].%s is missing", field)
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

func assertStringSliceContains(t *testing.T, values []interface{}, want string) {
	t.Helper()
	for _, value := range values {
		if got, ok := value.(string); ok && got == want {
			return
		}
	}
	t.Fatalf("%q missing from %v", want, values)
}
