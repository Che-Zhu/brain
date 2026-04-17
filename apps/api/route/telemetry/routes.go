package telemetry

import (
	"github.com/danielgtaylor/huma/v2"

	"sealos/api/route/logs"
	"sealos/api/route/metrics"
)

const basePath = "/api/telemetry/v1alpha1"

// Register adds telemetry (logs and metrics) routes to the Huma API.
func Register(api huma.API) {
	grp := huma.NewGroup(api, basePath)
	logs.Register(grp)
	metrics.Register(grp)
}
