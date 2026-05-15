package k8s

import (
	"errors"
	"fmt"
	"testing"
)

func TestIsUnknownResourceErrorMatchesWrappedResource(t *testing.T) {
	err := fmt.Errorf("discovery failed: %w", UnknownResourceError{Resource: "entrypoints"})

	if !IsUnknownResourceError(err, "entrypoints") {
		t.Fatal("expected wrapped unknown entrypoints resource error to match")
	}
	if !IsUnknownResourceError(err, "") {
		t.Fatal("expected empty resource filter to match any unknown resource error")
	}
	if IsUnknownResourceError(err, "aps") {
		t.Fatal("did not expect entrypoints error to match aps")
	}
}

func TestIsUnknownResourceErrorIgnoresPlainText(t *testing.T) {
	err := errors.New(`unknown resource "entrypoints"`)

	if IsUnknownResourceError(err, "entrypoints") {
		t.Fatal("plain text errors should not be treated as structured unknown resource errors")
	}
}
