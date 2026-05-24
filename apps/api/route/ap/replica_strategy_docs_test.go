package ap

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAPReplicaStrategyDocsListCanonicalExamplesAndAutoscaleBoundary(t *testing.T) {
	docs := map[string][]string{
		"apps/ui/public/skills/sealos-crossplane/SKILL.md": {
			"AP Replica Strategy",
			"Fixed Replicas",
			"Elastic Scaling",
			"`resource.replicaStrategy`",
			"AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API.",
		},
		"packages/crossplane/public/service/ap/templates/README.md": {
			"AP Replica Strategy examples",
			"ap-legacy-fixed-example.yaml",
			"ap-fixed-replicas-example.yaml",
			"ap-cpu-elastic-example.yaml",
			"ap-memory-elastic-example.yaml",
			"`spec.resource.replicaStrategy`",
		},
		"packages/crossplane/public/service/ap/templates/USAGE.md": {
			"Canonical AP Replica Strategy examples",
			"Fixed Replicas",
			"CPU Elastic Scaling",
			"Memory Elastic Scaling",
			"AP Settings must not create unmanaged autoscaler resources through the generic Kubernetes autoscale API.",
		},
	}

	for file, fragments := range docs {
		t.Run(file, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(repoRoot(t), file))
			if err != nil {
				t.Fatalf("read %s: %v", file, err)
			}
			text := string(raw)
			for _, want := range fragments {
				if !strings.Contains(text, want) {
					t.Fatalf("expected %s to contain %q", file, want)
				}
			}
		})
	}
}
