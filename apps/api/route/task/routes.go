package task

import (
	"github.com/danielgtaylor/huma/v2"
)

// Register adds the task API routes to the Huma API.
//
// Task API overview:
// - Source-to-Image (S2I): POST /s2i creates a Task; GET /s2i?name=... returns status and, when complete, the result ConfigMap payload.
// - Prerequisite: the target namespace must contain Secret `ghcr-cred` with key `githubToken`.
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/task/v1alpha1")
	registerS2i(grp)
	registerS2iGet(grp)
}
