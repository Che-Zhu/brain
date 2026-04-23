package auth

import (
	"github.com/danielgtaylor/huma/v2"
)

// Register adds the Auth API routes to the Huma API.
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/auth/v1alpha1")
	registerRegionToken(grp)
}
