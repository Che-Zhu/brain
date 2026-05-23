package ap

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
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
	if _, ok := networkProps["publicAddresses"]; ok {
		t.Fatal("spec.input.network.publicAddresses should not be accepted in the v1 contract")
	}
	platformAddresses := asMap(t, networkProps["platformAddresses"], "spec.input.network.platformAddresses")
	if got := platformAddresses["type"]; got != "array" {
		t.Fatalf("platformAddresses type = %v, want array", got)
	}
	listType, _ := platformAddresses["x-kubernetes-list-type"].(string)
	if listType != "map" {
		t.Fatalf("platformAddresses x-kubernetes-list-type = %v, want map", listType)
	}
	mapKeys := asSlice(t, platformAddresses["x-kubernetes-list-map-keys"], "spec.input.network.platformAddresses.x-kubernetes-list-map-keys")
	assertStringSliceContains(t, mapKeys, "id")
	platformAddressItem := asMap(t, platformAddresses["items"], "spec.input.network.platformAddresses.items")
	platformAddressRequired := asSlice(t, platformAddressItem["required"], "spec.input.network.platformAddresses.items.required")
	assertStringSliceContains(t, platformAddressRequired, "id")
	assertStringSliceContains(t, platformAddressRequired, "port")
	platformAddressProps := asMap(t, platformAddressItem["properties"], "spec.input.network.platformAddresses.items.properties")
	id := asMap(t, platformAddressProps["id"], "spec.input.network.platformAddresses.items.id")
	if got := id["type"]; got != "string" {
		t.Fatalf("platformAddresses id type = %v, want string", got)
	}
	if got := id["pattern"]; got != "^pa_[a-z0-9]{6,32}$" {
		t.Fatalf("platformAddresses id pattern = %v, want v1 opaque ID pattern", got)
	}
	publicPort := asMap(t, platformAddressProps["port"], "spec.input.network.platformAddresses.items.port")
	if got := publicPort["type"]; got != "integer" {
		t.Fatalf("platformAddresses port type = %v, want integer", got)
	}
	if got := publicPort["minimum"]; got != float64(1) {
		t.Fatalf("platformAddresses port minimum = %v, want 1", got)
	}
	if got := publicPort["maximum"]; got != float64(65535) {
		t.Fatalf("platformAddresses port maximum = %v, want 65535", got)
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
	for _, field := range []string{"id", "host", "url", "port", "type", "status"} {
		if _, ok := statusPublicAddressProps[field]; !ok {
			t.Fatalf("status.network.publicAddresses[].%s is missing", field)
		}
	}
}

func TestAPXRDIncludesFixedReplicaStrategyContract(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/ap.yaml"))
	if err != nil {
		t.Fatalf("read AP XRD: %v", err)
	}

	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse AP XRD: %v", err)
	}

	specProps := xrdSpecProperties(t, doc)
	resource := asMap(t, specProps["resource"], "spec.resource")
	resourceProps := asMap(t, resource["properties"], "spec.resource.properties")
	replicaStrategy := asMap(t, resourceProps["replicaStrategy"], "spec.resource.replicaStrategy")
	if got := replicaStrategy["type"]; got != "object" {
		t.Fatalf("replicaStrategy type = %v, want object", got)
	}
	replicaStrategyRequired := asSlice(t, replicaStrategy["required"], "spec.resource.replicaStrategy.required")
	assertStringSliceContains(t, replicaStrategyRequired, "type")
	assertValidationRule(t, replicaStrategy, "self.type == 'fixed' ? has(self.fixed) : true")
	strategyProps := asMap(t, replicaStrategy["properties"], "spec.resource.replicaStrategy.properties")
	strategyType := asMap(t, strategyProps["type"], "spec.resource.replicaStrategy.type")
	assertStringSliceContains(t, asSlice(t, strategyType["enum"], "spec.resource.replicaStrategy.type.enum"), "fixed")

	fixed := asMap(t, strategyProps["fixed"], "spec.resource.replicaStrategy.fixed")
	fixedRequired := asSlice(t, fixed["required"], "spec.resource.replicaStrategy.fixed.required")
	assertStringSliceContains(t, fixedRequired, "replicas")
	fixedProps := asMap(t, fixed["properties"], "spec.resource.replicaStrategy.fixed.properties")
	replicas := asMap(t, fixedProps["replicas"], "spec.resource.replicaStrategy.fixed.replicas")
	if got := replicas["type"]; got != "integer" {
		t.Fatalf("fixed replicas type = %v, want integer", got)
	}
	if got := replicas["minimum"]; got != float64(1) {
		t.Fatalf("fixed replicas minimum = %v, want 1", got)
	}
	if got := replicas["maximum"]; got != float64(20) {
		t.Fatalf("fixed replicas maximum = %v, want 20", got)
	}
}

func TestAPXRDIncludesCPUElasticReplicaStrategyContract(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/ap.yaml"))
	if err != nil {
		t.Fatalf("read AP XRD: %v", err)
	}

	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse AP XRD: %v", err)
	}

	specProps := xrdSpecProperties(t, doc)
	resource := asMap(t, specProps["resource"], "spec.resource")
	resourceProps := asMap(t, resource["properties"], "spec.resource.properties")
	replicaStrategy := asMap(t, resourceProps["replicaStrategy"], "spec.resource.replicaStrategy")
	strategyProps := asMap(t, replicaStrategy["properties"], "spec.resource.replicaStrategy.properties")
	assertValidationRule(t, replicaStrategy, "self.type == 'elastic' ? has(self.elastic) : true")
	strategyType := asMap(t, strategyProps["type"], "spec.resource.replicaStrategy.type")
	assertStringSliceContains(t, asSlice(t, strategyType["enum"], "spec.resource.replicaStrategy.type.enum"), "elastic")

	elastic := asMap(t, strategyProps["elastic"], "spec.resource.replicaStrategy.elastic")
	elasticRequired := asSlice(t, elastic["required"], "spec.resource.replicaStrategy.elastic.required")
	for _, field := range []string{"minReplicas", "maxReplicas", "target"} {
		assertStringSliceContains(t, elasticRequired, field)
	}
	elasticProps := asMap(t, elastic["properties"], "spec.resource.replicaStrategy.elastic.properties")
	for _, field := range []string{"minReplicas", "maxReplicas"} {
		replicas := asMap(t, elasticProps[field], "spec.resource.replicaStrategy.elastic."+field)
		if got := replicas["type"]; got != "integer" {
			t.Fatalf("elastic %s type = %v, want integer", field, got)
		}
		if got := replicas["minimum"]; got != float64(1) {
			t.Fatalf("elastic %s minimum = %v, want 1", field, got)
		}
		if got := replicas["maximum"]; got != float64(20) {
			t.Fatalf("elastic %s maximum = %v, want 20", field, got)
		}
	}
	assertValidationRule(t, elastic, "self.minReplicas <= self.maxReplicas")

	target := asMap(t, elasticProps["target"], "spec.resource.replicaStrategy.elastic.target")
	targetRequired := asSlice(t, target["required"], "spec.resource.replicaStrategy.elastic.target.required")
	for _, field := range []string{"metric", "type", "utilizationPercent"} {
		assertStringSliceContains(t, targetRequired, field)
	}
	targetProps := asMap(t, target["properties"], "spec.resource.replicaStrategy.elastic.target.properties")
	metric := asMap(t, targetProps["metric"], "spec.resource.replicaStrategy.elastic.target.metric")
	assertStringSliceContains(t, asSlice(t, metric["enum"], "spec.resource.replicaStrategy.elastic.target.metric.enum"), "cpu")
	targetType := asMap(t, targetProps["type"], "spec.resource.replicaStrategy.elastic.target.type")
	assertStringSliceContains(t, asSlice(t, targetType["enum"], "spec.resource.replicaStrategy.elastic.target.type.enum"), "utilization")
	utilization := asMap(t, targetProps["utilizationPercent"], "spec.resource.replicaStrategy.elastic.target.utilizationPercent")
	if got := utilization["type"]; got != "integer" {
		t.Fatalf("CPU utilizationPercent type = %v, want integer", got)
	}
	if got := utilization["minimum"]; got != float64(1) {
		t.Fatalf("CPU utilizationPercent minimum = %v, want 1", got)
	}
	if got := utilization["maximum"]; got != float64(100) {
		t.Fatalf("CPU utilizationPercent maximum = %v, want 100", got)
	}
}

func TestAPMutationDocsReferenceCanonicalFixedReplicaStrategy(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "apps/api/route/ap/mutation.go"))
	if err != nil {
		t.Fatalf("read AP mutation docs: %v", err)
	}
	text := string(raw)
	for _, fragment := range []string{
		"spec.resource.replicaStrategy.type: fixed or elastic AP replica behavior.",
		"spec.resource.replicaStrategy.fixed.replicas: Fixed Replicas count, 1-20.",
		"spec.resource.replicaStrategy.elastic: Elastic Scaling with minReplicas, maxReplicas, and CPU utilization target.",
		"Legacy spec.resource.replicas remains accepted as a Fixed Replicas fallback when replicaStrategy is absent.",
		"Change Fixed Replicas: {\\\"spec\\\":{\\\"resource\\\":{\\\"replicaStrategy\\\":{\\\"type\\\":\\\"fixed\\\",\\\"fixed\\\":{\\\"replicas\\\":2}}}}}",
		"Change CPU Elastic Scaling: {\\\"spec\\\":{\\\"resource\\\":{\\\"replicaStrategy\\\":{\\\"type\\\":\\\"elastic\\\",\\\"elastic\\\":{\\\"minReplicas\\\":2,\\\"maxReplicas\\\":8,\\\"target\\\":{\\\"metric\\\":\\\"cpu\\\",\\\"type\\\":\\\"utilization\\\",\\\"utilizationPercent\\\":75}}}}}}",
	} {
		if !strings.Contains(text, fragment) {
			t.Fatalf("expected AP mutation docs to contain %q", fragment)
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

func assertValidationRule(t *testing.T, schema map[string]interface{}, want string) {
	t.Helper()
	validations := asSlice(t, schema["x-kubernetes-validations"], "x-kubernetes-validations")
	for _, validation := range validations {
		validationMap := asMap(t, validation, "x-kubernetes-validations[]")
		if validationMap["rule"] == want {
			return
		}
	}
	t.Fatalf("validation rule %q missing from %v", want, validations)
}
