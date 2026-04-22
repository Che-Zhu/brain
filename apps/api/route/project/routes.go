package project

import (
	"github.com/danielgtaylor/huma/v2"
)

// Register adds the Projects API routes to the Huma API.
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/projects/v1alpha1")
	registerShare(grp)
}
