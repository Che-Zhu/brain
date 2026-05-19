# Domain Context

## Ubiquitous Language

### EntryPoint

A Crossplane XRD resource (`example.crossplane.io/v1`, kind `EntryPoint`) that represents the **public network access layer** for an AP. Each EntryPoint is 1:1 associated with an AP via `spec.apRef`. It only exists when the AP has public endpoints (i.e., at least one endpoint with `public: true` and a resolvable hostname).

EntryPoint is **automatically created by the AP Composition** (via provider-kubernetes Object) when the AP has public endpoints, and automatically deleted when the AP is deleted.

EntryPoint manages:

- **Targets** — each public AP endpoint (port + platform-assigned domain), written by the AP Composition.
- **Custom domain binding** (future) — CNAME verification + TLS certificate lifecycle for user-owned domains.

Not to be confused with: AP endpoints (which are the raw `spec.endpoints` on the AP resource), or Ingress (which is the underlying K8s resource created by Compositions).

### Target

One accessible public endpoint within an EntryPoint. Maps 1:1 to a public AP endpoint. Each target has:

- A platform-assigned domain (e.g., `my-app-abc123.region.nip.io`) — written by AP Composition, read-only from user perspective
- Zero or more custom domains (e.g., `app.mycompany.com`) — user-configured (future)
- A status derived from AP phase (all targets share AP's phase for now)

### AP (Application)

Crossplane composite resource (`example.crossplane.io/v1`, kind `AP`) that composes Deployment + Service(s) + Ingress + EntryPoint. Owns compute, basic networking, and triggers EntryPoint creation for public endpoints.

### Container Node

A canvas node that represents an AP workload. The name is retained as a product/UI term, but it does not mean an individual Kubernetes container.

### Canvas Layout

A Project-scoped visual arrangement of the canvas, shared by everyone who opens that Project.

### Canvas Label

A user-editable display name for a canvas node that does not rename the underlying AP, DB, or EntryPoint resource.

### Canvas Connection

A canvas edge that represents a real runtime dependency between resources. In the first version, Canvas Connections are detected from existing resource state rather than created by user-drawn edges.

### Workload Telemetry Series

A normalized time-series representation of workload resource usage for AP and DB workloads. It is consumed by both compact canvas node summaries and detailed metrics panels.

### Custom Domain Binding (future, not yet implemented)

The process of attaching a user-owned domain to an EntryPoint target. Blocked on cert-manager infrastructure. When implemented:

1. User PATCHes EntryPoint to add domain to `spec.customDomains`
2. EntryPoint Composition creates Ingress rule for the custom domain
3. DNS verification (user configures CNAME pointing to platform domain)
4. TLS certificate provisioning via cert-manager
5. Ongoing certificate renewal

Each custom domain will have its own lifecycle status, independent from the AP's health.

## Key Design Decisions

### EntryPoint is a separate resource from AP

Custom domain binding involves an independent lifecycle (DNS verification, certificate issuance/renewal) that should not pollute AP status. A certificate renewal failure is not an application failure. Separation keeps both resources' status clean and reconciliation logic focused.

### Pure Crossplane, no custom controller

EntryPoint uses Crossplane XRD for schema registration (consistent with AP and DB) and Crossplane Compositions for reconciliation. No custom K8s controller is introduced. This keeps the architecture uniform — all resources in the system are managed by Crossplane.

Two Compositions interact with EntryPoint:

- **AP Composition** creates/updates EntryPoint via provider-kubernetes Object (writes `spec.apRef` + `spec.targets`). Manages EntryPoint's lifecycle — creation when public endpoints exist, deletion when AP is deleted.
- **EntryPoint Composition** reconciles EntryPoint's own composed resources. Currently minimal (echoes spec to status). Will be extended to manage custom domain Ingress + Certificate resources when that feature is built.

These do not conflict: AP Composition writes EntryPoint's spec (external write), EntryPoint Composition writes status + composed resources (internal reconcile).

### EntryPoint creation is AP-Composition-driven

The AP Composition conditionally creates an EntryPoint (via provider-kubernetes Object) when `$needIngress` is true. When the AP is deleted, Crossplane cleans up all composed resources including the Object, which in turn deletes the EntryPoint. No external watch or controller needed.

### Entry node only appears for public APs

On the canvas, an entry node card is only rendered when the AP has a corresponding EntryPoint resource. Internal-only services (no public endpoints) do not produce EntryPoints or entry nodes.

### Canvas edges and layout are deferred

Entry node and container node are not connected by edges and have no special layout rules for now. Edge generation and node arrangement will be addressed as a unified system when more node-to-node relationships (AP-to-DB, AP-to-AP) are introduced.

### Canvas Layout is shared per Project

Canvas Layout is not a personal browser preference. It belongs to the Project and should be reused when the same Project is opened by another user, browser, or share preview. Ephemeral UI state such as the selected node, open panel, and temporary zoom can remain local.

### Canvas Layout v1 stores positions and labels, not viewport

The first persisted Canvas Layout stores node positions and optional Canvas Labels. Opening a Project computes the initial canvas view by fitting the currently rendered AP, DB, and EntryPoint nodes that the current user is allowed to see after the saved layout is applied. It does not store pan, zoom, selected node, open panel, or other ephemeral UI state.

### Canvas Layout saves merge by node

Canvas Layout saves should merge changes by node resource reference instead of replacing the whole layout document. Concurrent edits to different nodes should both survive; concurrent edits to the same node may use last-write-wins for that node.

### Orphan Canvas Layout items are retained temporarily

When a resource no longer appears in the detected graph, its Canvas Layout item should be hidden rather than deleted immediately. If the resource reappears, its layout is restored. Orphan layout items are purged after seven days.

### Canvas Layout is persisted in App Postgres

Canvas Layout belongs to the application persistence layer, not the Crossplane resource model. K8s and Crossplane remain the source of truth for Project, AP, DB, and EntryPoint resources; App Postgres stores the Project's visual arrangement.

### Canvas Layout is keyed by Project UID

Canvas Layout is identified by the Project's namespace and Kubernetes `metadata.uid`. The Project name may be stored as a display snapshot, but it does not define ownership because a Project can be renamed or recreated.

### Canvas node naming is separate from resource naming

Renaming a node on the canvas changes its Canvas Label. It does not rename the underlying Kubernetes resource. A resource rename, if introduced later, is a distinct workload migration operation and must preserve or migrate the Canvas Layout intentionally.

### Canvas edges are not freeform annotations

Users do not draw arbitrary diagram lines on the canvas. In the first version, edges are rendered only when the system detects a real runtime dependency such as EntryPoint-to-AP or AP-to-DB.

### Only established Canvas Connections are persisted

Connecting edges are temporary UI feedback for a future in-flight connection operation. App Postgres stores only established Canvas Connections whose required resource changes have succeeded. The first version does not support user-initiated connecting edges.

### Canvas telemetry is store-mediated

Canvas workload nodes should not wait for a full-project telemetry batch before rendering metrics. Workload discovery (AP, DB, EntryPoint lists) and Workload Telemetry Series refresh have different lifecycles.

Canvas nodes consume workload telemetry through a shared telemetry store rather than each node owning an independent polling loop. The first version treats mounted canvas nodes as eligible telemetry consumers and prioritizes the selected workload, without requiring viewport visibility calculation. For compact canvas summaries, the store batches mounted workload targets into snapshot requests so nodes can update independently while the network layer avoids one request per node.

Canvas telemetry snapshots use instant telemetry queries and return only the latest sampled metric values. Snapshot requests do not carry a sampling window. Detailed metrics panels request one workload at a time and use range telemetry queries with `start`, `end`, and `step` when they need a Workload Telemetry Series.

### Custom domain implementation is deferred

The `spec.customDomains` field is defined in the XRD schema but not functional. Implementation requires cert-manager + Let's Encrypt infrastructure that is not yet deployed. Platform-assigned domains use a wildcard certificate (`wildcard-cert`) and do not need per-domain certificate management.
