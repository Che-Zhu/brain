package ap

import (
	"os"
	"path/filepath"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestAPReplicaStrategyExamplesCoverFixedFallbackAndElasticTargets(t *testing.T) {
	tests := []struct {
		name   string
		file   string
		assert func(t *testing.T, resource map[string]interface{})
	}{
		{
			name: "legacy fixed fallback",
			file: "ap-legacy-fixed-example.yaml",
			assert: func(t *testing.T, resource map[string]interface{}) {
				t.Helper()
				if got := resource["replicas"]; got != float64(1) {
					t.Fatalf("legacy resource.replicas = %v, want 1", got)
				}
				if _, ok := resource["replicaStrategy"]; ok {
					t.Fatal("legacy fixed example should omit resource.replicaStrategy")
				}
			},
		},
		{
			name: "canonical fixed replicas",
			file: "ap-fixed-replicas-example.yaml",
			assert: func(t *testing.T, resource map[string]interface{}) {
				t.Helper()
				strategy := asMap(t, resource["replicaStrategy"], "spec.resource.replicaStrategy")
				if got := strategy["type"]; got != "fixed" {
					t.Fatalf("replicaStrategy.type = %v, want fixed", got)
				}
				fixed := asMap(t, strategy["fixed"], "spec.resource.replicaStrategy.fixed")
				if got := fixed["replicas"]; got != float64(2) {
					t.Fatalf("fixed replicas = %v, want 2", got)
				}
				if _, ok := resource["replicas"]; ok {
					t.Fatal("canonical fixed example should not use legacy resource.replicas")
				}
			},
		},
		{
			name: "CPU Elastic Scaling",
			file: "ap-cpu-elastic-example.yaml",
			assert: func(t *testing.T, resource map[string]interface{}) {
				t.Helper()
				elastic := elasticReplicaStrategy(t, resource)
				assertElasticReplicaBounds(t, elastic, 2, 8)
				target := asMap(t, elastic["target"], "spec.resource.replicaStrategy.elastic.target")
				if got := target["metric"]; got != "cpu" {
					t.Fatalf("target.metric = %v, want cpu", got)
				}
				if got := target["type"]; got != "utilization" {
					t.Fatalf("target.type = %v, want utilization", got)
				}
				if got := target["utilizationPercent"]; got != float64(75) {
					t.Fatalf("target.utilizationPercent = %v, want 75", got)
				}
				if _, ok := target["averageValue"]; ok {
					t.Fatal("CPU target should not include averageValue")
				}
			},
		},
		{
			name: "Memory Elastic Scaling",
			file: "ap-memory-elastic-example.yaml",
			assert: func(t *testing.T, resource map[string]interface{}) {
				t.Helper()
				elastic := elasticReplicaStrategy(t, resource)
				assertElasticReplicaBounds(t, elastic, 2, 8)
				target := asMap(t, elastic["target"], "spec.resource.replicaStrategy.elastic.target")
				if got := target["metric"]; got != "memory" {
					t.Fatalf("target.metric = %v, want memory", got)
				}
				if got := target["type"]; got != "averageValue" {
					t.Fatalf("target.type = %v, want averageValue", got)
				}
				if got := target["averageValue"]; got != "512Mi" {
					t.Fatalf("target.averageValue = %v, want 512Mi", got)
				}
				if _, ok := target["utilizationPercent"]; ok {
					t.Fatal("Memory target should not include utilizationPercent")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resource := readAPExampleResource(t, tt.file)
			tt.assert(t, resource)
		})
	}
}

func readAPExampleResource(t *testing.T, file string) map[string]interface{} {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/example/ap", file))
	if err != nil {
		t.Fatalf("read AP example %s: %v", file, err)
	}
	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse AP example %s: %v", file, err)
	}
	if got := doc["apiVersion"]; got != "example.crossplane.io/v1" {
		t.Fatalf("%s apiVersion = %v, want example.crossplane.io/v1", file, got)
	}
	if got := doc["kind"]; got != "AP" {
		t.Fatalf("%s kind = %v, want AP", file, got)
	}
	spec := asMap(t, doc["spec"], "spec")
	input := asMap(t, spec["input"], "spec.input")
	network := asMap(t, input["network"], "spec.input.network")
	if _, ok := network["privatePort"]; !ok {
		t.Fatalf("%s should include spec.input.network.privatePort as the App Listening Port", file)
	}
	return asMap(t, spec["resource"], "spec.resource")
}

func elasticReplicaStrategy(t *testing.T, resource map[string]interface{}) map[string]interface{} {
	t.Helper()
	strategy := asMap(t, resource["replicaStrategy"], "spec.resource.replicaStrategy")
	if got := strategy["type"]; got != "elastic" {
		t.Fatalf("replicaStrategy.type = %v, want elastic", got)
	}
	if _, ok := resource["replicas"]; ok {
		t.Fatal("Elastic Scaling example should not use legacy resource.replicas")
	}
	return asMap(t, strategy["elastic"], "spec.resource.replicaStrategy.elastic")
}

func assertElasticReplicaBounds(t *testing.T, elastic map[string]interface{}, minReplicas, maxReplicas float64) {
	t.Helper()
	if got := elastic["minReplicas"]; got != minReplicas {
		t.Fatalf("minReplicas = %v, want %v", got, minReplicas)
	}
	if got := elastic["maxReplicas"]; got != maxReplicas {
		t.Fatalf("maxReplicas = %v, want %v", got, maxReplicas)
	}
}
