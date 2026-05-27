package ap

import (
	"github.com/danielgtaylor/huma/v2"
)

// Register adds the AP (Application) API routes to the Huma API.
//
// AP is a Crossplane composite resource (example.crossplane.io/v1, kind: AP, plural: aps).
// The AP spec is the API contract for the generated Deployment, Service(s), Ingress, and EntryPoint:
// - name: logical instance name used for composed resource naming; defaults to metadata.name if omitted.
// - projectName: optional Project claim name in the same namespace (labels + ownerReference).
// - input: image, network.privatePort, network.platformAddresses, env, probes, imagePullPolicy.
// - resource: replicas, requests, limits (Kubernetes-shaped).
// - paused, restartRequest, ingressAnnotations: lifecycle and Ingress metadata.
func Register(api huma.API) {
	grp := huma.NewGroup(api, "/api/ap/v1alpha1")
	registerGet(grp)
	registerCreate(grp)
	registerUpdate(grp)
	registerDelete(grp)
	registerRestart(grp)
	registerEvents(grp)
}
