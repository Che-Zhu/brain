package ap

import (
	"github.com/danielgtaylor/huma/v2"
)

// Register adds the AP (Application) API routes to the Huma API.
//
// AP is a Crossplane composite resource (example.crossplane.io/v1, kind: AP, plural: aps).
// The AP spec is the API contract for the generated Deployment, Service(s), and Ingress:
// - name: logical instance name used for composed resource naming; defaults to metadata.name if omitted.
// - image: container image for the Deployment.
// - replicas: Deployment replica count.
// - port/host: legacy single-service/single-host inputs. Prefer endpoints for multiple routes.
// - endpoints: list of {port, host}; each item creates one ingress rule and one service target port, while unique ports determine the container/service ports.
// - cpuRequest/memoryRequest/cpuLimit/memoryLimit/imagePullPolicy: Deployment container resource and pull settings.
// - env: container env vars, each with name and either value or valueFrom (secretKeyRef/configMapKeyRef).
// - ingressAnnotations: merged into the generated Ingress metadata.
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/ap/v1alpha1")
	registerGet(grp)
	registerCreate(grp)
	registerUpdate(grp)
	registerDelete(grp)
	registerRestart(grp)
}
