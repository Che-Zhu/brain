package notif

import (
	"github.com/danielgtaylor/huma/v2"
)

// Register adds notification-related API routes to the Huma API.
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/notif/v1alpha1")
	registerWebhookAlert(grp)
}
