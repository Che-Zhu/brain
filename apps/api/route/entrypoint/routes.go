package entrypoint

import "github.com/danielgtaylor/huma/v2"

// Register adds the EntryPoint API routes to the Huma API.
//
// EntryPoint is a namespaced Crossplane composite resource
// (example.crossplane.io/v1, kind: EntryPoint, plural: entrypoints).
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/entrypoint/v1alpha1")
	registerGet(grp)
}
