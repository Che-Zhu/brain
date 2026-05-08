package migrate

import "testing"

func resetFlags() {
	DeprecatedConfigKey = false
}

func TestWarnings_NoDeprecations(t *testing.T) {
	resetFlags()
	warnings := Warnings()
	if len(warnings) != 0 {
		t.Errorf("expected no warnings, got %d", len(warnings))
	}
}

func TestWarnings_DeprecatedConfigKey(t *testing.T) {
	resetFlags()
	defer resetFlags()
	DeprecatedConfigKey = true

	warnings := Warnings()
	if len(warnings) != 1 {
		t.Fatalf("expected 1 warning, got %d", len(warnings))
	}
	if warnings[0] == "" {
		t.Error("expected non-empty warning message")
	}
}
