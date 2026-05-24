package ap

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAPReplicaStrategyDocsListCanonicalExamplesAndAutoscaleBoundary(t *testing.T) {
	docs := []struct {
		file      string
		fragments []string
	}{
		{
			file: "apps/ui/public/skills/sealos-crossplane/SKILL.md",
			fragments: []string{
				"AP Replica Strategy",
				"Fixed Replicas",
				"Elastic Scaling",
				"`resource.replicaStrategy`",
				"AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API.",
			},
		},
		{
			file: "packages/crossplane/public/service/ap/templates/README.md",
			fragments: []string{
				"AP Replica Strategy examples",
				"ap-legacy-fixed-example.yaml",
				"ap-fixed-replicas-example.yaml",
				"ap-cpu-elastic-example.yaml",
				"ap-memory-elastic-example.yaml",
				"`spec.resource.replicaStrategy`",
			},
		},
		{
			file: "packages/crossplane/public/service/ap/templates/USAGE.md",
			fragments: []string{
				"Canonical AP Replica Strategy examples",
				"Fixed Replicas",
				"CPU Elastic Scaling",
				"Memory Elastic Scaling",
				"AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API.",
			},
		},
	}

	for _, doc := range docs {
		t.Run(doc.file, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(repoRoot(t), doc.file))
			if err != nil {
				t.Fatalf("read %s: %v", doc.file, err)
			}
			text := string(raw)
			for _, want := range doc.fragments {
				if !strings.Contains(text, want) {
					t.Fatalf("expected %s to contain %q", doc.file, want)
				}
			}
		})
	}
}

func TestAPTemplateUsageAvoidsHistoricalFlatAPFields(t *testing.T) {
	file := "packages/crossplane/public/service/ap/templates/USAGE.md"
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), file))
	if err != nil {
		t.Fatalf("read %s: %v", file, err)
	}
	text := string(raw)
	for _, legacyField := range []string{
		"\n  host:",
		"\n  replicas:",
		"\n  cpuRequest:",
		"\n  memoryRequest:",
		"\n  cpuLimit:",
		"\n  memoryLimit:",
	} {
		if strings.Contains(text, legacyField) {
			t.Fatalf("%s should not show historical flat AP field %q", file, strings.TrimSpace(legacyField))
		}
	}
}

func TestGeneratedTemplateInstancesUseCanonicalFixedReplicaStrategy(t *testing.T) {
	files, err := filepath.Glob(filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/templates/*-composite.yaml"))
	if err != nil {
		t.Fatalf("list generated template compositions: %v", err)
	}
	if len(files) == 0 {
		t.Fatal("expected generated template compositions")
	}

	canonicalSnippet := strings.Join([]string{
		"        resource:",
		"          replicaStrategy:",
		"            type: fixed",
		"            fixed:",
		"              replicas: 1",
	}, "\n")
	legacySnippet := strings.Join([]string{
		"        resource:",
		"          replicas: 1",
	}, "\n")

	for _, file := range files {
		t.Run(filepath.Base(file), func(t *testing.T) {
			raw, err := os.ReadFile(file)
			if err != nil {
				t.Fatalf("read generated template composition: %v", err)
			}
			text := string(raw)
			if strings.Contains(text, legacySnippet) {
				t.Fatal("template/instance should not use legacy spec.resource.replicas")
			}
			if !strings.Contains(text, canonicalSnippet) {
				t.Fatal("template/instance should include canonical fixed replicaStrategy")
			}
		})
	}
}
