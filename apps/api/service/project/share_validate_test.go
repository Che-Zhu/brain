package project

import "testing"

func TestShareK8sKindAllowedIncludesPreviewGraphKinds(t *testing.T) {
	for _, kind := range []string{"ap", "aps", "db", "dbs", "entrypoint", "entrypoints"} {
		if !ShareK8sKindAllowed(kind) {
			t.Fatalf("expected share token to allow preview graph kind %q", kind)
		}
	}
}

func TestShareK8sKindAllowedDeniesUnrelatedKinds(t *testing.T) {
	for _, kind := range []string{"pods", "secrets", "deployments", ""} {
		if ShareK8sKindAllowed(kind) {
			t.Fatalf("expected share token to deny kind %q", kind)
		}
	}
}
