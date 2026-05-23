# Domain Context

## Ubiquitous Language

### EntryPoint

A Crossplane XRD resource (`example.crossplane.io/v1`, kind `EntryPoint`) that represents the **allocated public routing layer** for an AP. Each EntryPoint is 1:1 associated with an AP via `spec.apRef`.

EntryPoint is **automatically created by the AP Composition** (via provider-kubernetes Object) when the AP has allocated public routing targets, and automatically deleted when the AP is deleted. A Requested Platform Address may remain pending before an EntryPoint exists.

EntryPoint manages:

- **Public Addresses** — externally reachable URLs/domains for the AP, each targeting an App Listening Port.
- **Custom domain binding** (future) — CNAME verification + TLS certificate lifecycle for user-owned Public Addresses.

Not to be confused with: App Listening Ports (container ports where the application accepts traffic), AP endpoints (the raw legacy `spec.endpoints` on the AP resource), or Ingress (which is the underlying K8s resource created by Compositions).

### App Listening Port

An AP container port where the application accepts traffic for a Private Address or Public Address.

### Private Address

The single cluster-internal URL shown for an AP, targeting one App Listening Port.

### Public Address

An externally reachable URL/domain alias for an AP that targets one App Listening Port.

### Platform Address

A system-assigned Public Address that the platform can create without user DNS or certificate setup; in v1, users request one by choosing an App Listening Port, not by providing a host or URL.

### Requested Platform Address

A v1 Platform Address desired entry in AP `spec.input.network.platformAddresses[]`. It has a stable Platform Address ID and target App Listening Port, but no platform-allocated host or URL yet.

### Allocated Platform Address

A Platform Address whose host and URL have been assigned by the platform and published through AP observed network state.

### Reachable Public Address

A Public Address whose allocated host resolves and successfully routes external traffic to the target App Listening Port. Business-level HTTP errors from the workload do not make the Public Address unreachable; DNS failure, TLS/connectivity failure, or routing to the wrong backend does.

### Custom Domain

A user-owned Public Address that requires DNS verification and TLS certificate lifecycle management. Multiple Custom Domains may target the same App Listening Port.

### AP (Application)

Crossplane composite resource (`example.crossplane.io/v1`, kind `AP`) that composes Deployment + Service(s), and optionally public Ingress + EntryPoint resources when the AP has allocated Public Addresses. Owns compute, App Listening Ports, one Private Address, and Platform Address allocation requests.

### AP Replica Strategy

The AP configuration choice for how many workload replicas should run: either a fixed user-selected count or Elastic Scaling within user-selected bounds.

### Fixed Replicas

An AP Replica Strategy where the user selects one desired replica count and the platform keeps the AP at that count.

### Elastic Scaling

An AP Replica Strategy where the platform automatically adjusts AP replicas between a user-selected minimum and maximum based on one selected resource utilization target.

### DB (Database)

Crossplane composite resource (`example.crossplane.io/v1`, kind `DB`) that represents a managed database workload available to APs in the same Project.

### DB Configuration Draft

A local set of pending DB configuration changes that is submitted only when the user confirms the update.

### Database Binding

A runtime dependency where an AP is configured to consume one DB's connection credentials.

### Container Node

A canvas node that represents an AP workload. The name is retained as a product/UI term, but it does not mean an individual Kubernetes container.

### Canvas Layout

A Project-scoped visual arrangement of the canvas, shared by everyone who opens that Project.

### Canvas Node Expansion State

The per-node expanded or collapsed presentation state of a canvas node card.

### Canvas Node Stack Order

The per-node visual layering order used when canvas node cards overlap.

### Canvas Connection

A canvas edge that represents an established runtime dependency between resources.

### Connecting Edge

A temporary canvas interaction created when a user drags a line between canvas nodes. A Connecting Edge may become a domain command only when its endpoints match a supported resource relationship, regardless of drag direction.

### Workload Telemetry Series

A normalized time-series representation of workload resource usage for AP and DB workloads. It is consumed by both compact canvas node summaries and detailed metrics panels.

### Project Aggregate Status

A derived health tone for one Project row in the project list, computed from the phases of the Project's APs and DBs. It is not a field on the Project resource; it is computed in the UI from sibling workload lists. It expresses "are the workloads inside this project healthy", which is what users look at on the list, and is distinct from the Project composite's own `status.conditions[Ready]` (which only reflects whether the Project composition itself reconciled).

### Custom Domain Binding (future, not yet implemented)

The process of attaching a Custom Domain as a Public Address for an AP. Blocked on cert-manager infrastructure. When implemented, the desired-state location will be decided by the Custom Domain PRD; the lifecycle still includes:

1. User adds a Custom Domain and target App Listening Port.
2. Platform creates or updates the public routing rule for the custom domain.
3. DNS verification, commonly via user-configured CNAME to a platform target.
4. TLS certificate provisioning via cert-manager.
5. Ongoing certificate renewal.

Each Custom Domain will have its own lifecycle status, independent from the AP's health.

## Key Design Decisions

### EntryPoint is a separate resource from AP

Custom domain binding involves an independent lifecycle (DNS verification, certificate issuance/renewal) that should not pollute AP status. A certificate renewal failure is not an application failure. Separation keeps both resources' status clean and reconciliation logic focused.

### Pure Crossplane, no custom controller

EntryPoint uses Crossplane XRD for schema registration (consistent with AP and DB) and Crossplane Compositions for reconciliation. No custom K8s controller is introduced. This keeps the architecture uniform — all resources in the system are managed by Crossplane.

Two Compositions interact with EntryPoint:

- **AP Composition** creates/updates EntryPoint via provider-kubernetes Object (writes `spec.apRef` + allocated Public Address target data). Manages EntryPoint's lifecycle — creation when allocated public routing targets exist, deletion when AP is deleted.
- **EntryPoint Composition** reconciles EntryPoint's own composed resources. Currently minimal (echoes spec to status). Will be extended to manage custom domain Ingress + Certificate resources when that feature is built.

These do not conflict: AP Composition writes EntryPoint's spec (external write), EntryPoint Composition writes status + composed resources (internal reconcile).

### EntryPoint creation is AP-Composition-driven

The AP Composition conditionally creates an EntryPoint (via provider-kubernetes Object) when `$needIngress` is true, which means the AP has allocated public routing targets. A Requested Platform Address can remain pending without an EntryPoint if the routing domain carrier is missing or host allocation has not happened yet. When the AP is deleted, Crossplane cleans up all composed resources including the Object, which in turn deletes the EntryPoint. No external watch or controller needed.

### Private Address hides per-port private URLs

The AP Settings UI should show one Private Address, not one private URL per App Listening Port. Additional private URLs may be technically reachable by changing the port, but the main product model should keep them hidden.

### Private Address targets one app listening port

The Private Address targets one App Listening Port. It may include a port in the URL when the target App Listening Port is not HTTP's default port.

### Private Address omits the default HTTP port

When the Private Address targets port 80, the UI should omit `:80`. When it targets another App Listening Port, the UI should include that port in the URL.

### Public Addresses target app listening ports directly

Each Public Address chooses the App Listening Port it should reach. Users should configure this as "the port your app is listening on," not as a public port.

### Platform Addresses are allocated by the platform

For v1 Platform Addresses, the user chooses the target App Listening Port while the UI/API supplies a stable opaque Platform Address ID. The platform allocates the public host and URL, and the UI renders those values from observed state.

Observed Public Address rows include the stable Platform Address ID so desired and observed addresses can be matched even when multiple addresses target the same App Listening Port.

EntryPoint targets carry the same stable Platform Address ID as the AP desired and observed Public Address rows.

### Platform Address base domain is platform configuration

The base domain used to allocate Platform Address hosts belongs to platform installation configuration, not to the AP user contract. In v1, `metadata.labels.region` is the existing carrier for that routing domain when the AP creation path sets it from the cluster's known ingress base host; the AP Composition must not use a hardcoded or arbitrary host-formatting suffix.

### Platform Address identity is stable in v1

For v1 Platform Addresses, identity belongs to the Public Address itself, not to the target App Listening Port. The target App Listening Port is chosen when the Platform Address is created and is not editable afterward; changing the target port means deleting the old Public Address and creating a new one.

The Platform Address ID is generated by the UI/API when the address is added and is persisted in desired state. The ID is opaque and stable; the AP Composition consumes it when allocating the host.

Every v1 Platform Address desired entry must include both its stable ID and its target App Listening Port.

Port-only Platform Address entries from earlier drafts are not part of the v1 contract. They should be deleted and recreated rather than preserved or migrated.

Platform Address IDs use the opaque format `pa_` followed by lowercase alphanumeric characters.

### Platform Address hosts are stable platform allocations

For a given AP and Platform Address identity, the platform should allocate a stable host derived from platform-owned identity such as namespace, AP name, AP UID, Platform Address ID, and the configured base domain.

V1 Platform Address hosts use `{dns-safe-ap-name}-{slug}.{routing-domain}`. The slug is a 10-character hash derived from AP identity and Platform Address ID, not from the target App Listening Port.

### Pending Platform Address

A Requested Platform Address whose stable ID and target App Listening Port exist in desired state but whose platform-allocated URL has not appeared in observed state yet. The UI may show it as pending, but must not invent a host or URL.

If the routing domain carrier is missing, a requested Platform Address remains pending rather than falling back to a hardcoded host or exposing an invented URL.

### Platform Addresses are identified separately from target ports in v1

An AP may have multiple Platform Addresses, including multiple addresses that target the same App Listening Port. Each Platform Address has its own stable identity.

Platform Address IDs, not target App Listening Ports, are unique within an AP.

### Public Address ownership differs from its UI surface

Public Addresses belong to the EntryPoint domain model, but the AP Settings panel's Network section is the primary UI surface for viewing and managing them because users think about network access from the AP they are configuring.

### AP Settings owns the empty Public Addresses affordance

The AP Settings panel should show Public Addresses even when the AP has no EntryPoint yet. Adding the first Public Address creates a Requested Platform Address; once allocation is possible, the AP Composition creates or enables the EntryPoint behind the scenes. Users should not need a separate "create EntryPoint" action.

### New APs are private by default

A newly created AP should start with only its Private Address and no Public Addresses. Public Addresses are created only after an explicit user action.

### Public Addresses have platform and custom forms

Adding a Public Address in v1 should create a Platform Address. Custom Domains belong in the same Public Addresses area, but remain future functionality until DNS verification and TLS certificate management are implemented.

### Custom Domains are unique by domain, not by app listening port

Multiple Custom Domains may point to the same App Listening Port because user-owned domains naturally support aliases such as production, demo, and vanity domains for the same application process.

### Platform Addresses are not limited to one

An AP may have multiple Platform Addresses, including multiple Platform Addresses that target the same App Listening Port. The domain model should not assume there is only one system-assigned public URL per AP.

### Public Addresses display by URL, Platform Addresses match by ID

Public Addresses should be displayed by URL when allocated. Do not introduce a separate user-facing name or label until the domain needs one. V1 Platform Address persistence and desired/observed matching use the stable Platform Address ID; the ID is not a user-facing label.

### Entry node only appears for public APs

On the canvas, an entry node card is rendered for APs with requested or observed Public Addresses. When a corresponding EntryPoint resource exists, the node uses EntryPoint resource metadata. Before the EntryPoint exists, the UI may render an AP-backed pending entry node from AP network desired/observed state. Internal-only APs with no Public Address request do not render entry nodes.

### Newly detected entry nodes anchor to their AP's left side

When an EntryPoint has no saved Canvas Layout entry, its initial canvas position is one fallback grid cell to the left of its AP — `{ x: AP.position.x - 340, y: AP.position.y }`. This rule applies in every "no saved layout" case: first appearance, return after orphan cleanup, or any future scenario where the saved entry is absent. Once the user moves the EntryPoint, the saved position takes precedence on subsequent loads.

The fallback grid used for APs and DBs extends rightward from the origin, so anchoring EntryPoints to the AP's left side keeps them off the fallback grid and avoids collisions with other unplaced nodes. The rule preserves the visual coupling between AP and EntryPoint, mirrors the resource-level 1:1 relationship, and avoids Canvas Connections that cross the canvas.

### Canvas Layout is shared per Project

Canvas Layout is not a personal browser preference. It belongs to the Project and should be reused when the same Project is opened by another user, browser, or share preview. Node positions and Canvas Node Expansion State are shared; ephemeral UI state such as the selected node, open panel, and temporary zoom can remain local.

### Canvas Layout v1 stores positions, node expansion, and stack order, not viewport or names

The first persisted Canvas Layout stores node positions, Canvas Node Expansion State, and Canvas Node Stack Order. Opening a Project computes the initial canvas view by fitting the currently rendered AP, DB, and EntryPoint nodes that the current user is allowed to see after the saved layout is applied. It does not store pan, zoom, selected node, open panel, Resource Display Names, or other non-layout state.

### Canvas Node Expansion State defaults to collapsed

When a Canvas Layout item has no saved Canvas Node Expansion State, the node should render collapsed. This covers newly detected nodes and older saved layouts created before node expansion was persisted.

### Canvas Node Expansion State belongs to each layout node

Canvas Node Expansion State is stored on the same Canvas Layout item as the node position. It is absent when unknown and interpreted as collapsed.

### Canvas Node Expansion State applies to all project canvas node types

Canvas Node Expansion State applies to every Project canvas node type that supports card expansion, including AP, DB, and EntryPoint nodes.

### Canvas Node Stack Order is shared per Project

Canvas Node Stack Order is part of the shared Canvas Layout and should be reused when the same Project is opened by another user, browser, or share preview.

### Selecting a canvas node brings it to the front

When a user selects a canvas node in an editable Project canvas, that node should become the topmost node in the Canvas Node Stack Order so overlapped node cards remain readable.

Node click, node drag start, and URL-driven node selection all count as canvas node selection for Canvas Node Stack Order. Hover-driven expansion does not change Canvas Node Stack Order.

In read-only canvases and share previews, selecting a canvas node may bring it to the front locally for readability, but it must not persist Canvas Node Stack Order changes.

Selecting a Canvas Connection does not change Canvas Node Stack Order.

When a canvas node has no saved Canvas Node Stack Order, its default layer follows the detected resource order: AP nodes below DB nodes, and DB nodes below EntryPoint nodes. An explicit saved Canvas Node Stack Order takes precedence over the default resource layer.

Canvas Node Stack Order values are normalized by the Next.js canvas layout API before persistence. The client may optimistically bring a selected node to the front immediately, but should avoid saving when the node is already topmost.

Concurrent Canvas Node Stack Order saves use last-write-wins semantics. If multiple editable sessions select different nodes close together, the later Next.js canvas layout PATCH determines the topmost saved node; the product does not provide real-time shared stacking feedback.

When an orphaned Canvas Layout item reappears as a detected canvas node, it should be brought to the front only if it was absent long enough to be treated as a meaningful return. A brief absence shorter than the 10-second stack-order return stability window should restore the node's previous Canvas Node Stack Order instead of stealing the top layer.

When a resource reappears with the same kind, namespace, and name but a different Kubernetes UID, its saved position and Canvas Node Expansion State should still be restored, but its Canvas Node Stack Order should be treated as a fresh return; if the orphan absence exceeded the 10-second stability window, it should be brought to the front.

### Unplaced AP and DB nodes use fallback grid raster-scan placement

When an AP or DB node has no saved Canvas Layout entry, its initial canvas position is the first 340×280 grid slot (3 columns from origin, then row by row) whose rectangle does not intersect any already-allocated node rectangle. Multiple unplaced nodes detected in the same render are placed in `kind:namespace:name` lexicographic order to keep ordering deterministic across users.

The slot search is a pure function of the saved Canvas Layout plus the currently detected nodes — viewport state is never an input. EntryPoints are excluded from the search; they anchor to their AP's left side at `x < 0` and never occupy fallback grid slots. Placement is in-memory only and does not write to Canvas Layout — once the user moves a placed node, the existing debounced save path takes over.

### Newly detected unplaced nodes pull the viewport to follow

When a SWR refresh produces previously-unseen unplaced nodes, the canvas follows them: a single new node uses `setCenter` (preserving zoom); multiple simultaneous new nodes use `fitView` framed to the new subset. This applies regardless of trigger source — the product's main creation path is in-UI where viewport-follow is expected, and rare external triggers (kubectl/API) accept the same follow rather than carrying a per-trigger flag through the detection pipeline.

The first detect after opening the canvas is not a follow event — opening `fitView` (keyed on Project UID) already handles initial framing.

### Share previews may expand nodes locally

Share previews read shared Canvas Layout, including Canvas Node Expansion State, but do not persist layout changes. Preview users may temporarily expand or collapse nodes for reading without changing the Project's shared layout.

### Auto-expanded nodes are saved in editable Projects

In an editable Project canvas, hover-driven node auto-expansion updates the shared Canvas Node Expansion State and is saved through the debounced Canvas Layout save flow. In share previews, the same interaction remains local and unsaved.

### Canvas Layout is not live-synchronized

Canvas Layout is shared through persistence, not through real-time collaboration. Users who already have the same Project open do not need to see another user's position, Canvas Node Expansion State, or Canvas Node Stack Order changes until the layout is reloaded or fetched again.

### Pending local layout edits take precedence

After a local user changes a node position, Canvas Node Expansion State, or Canvas Node Stack Order, that pending local layout edit should remain visible until the debounced save completes. Freshly fetched shared layout should not immediately overwrite pending local edits.

### Canvas Layout saves are debounced and merge by node

Canvas Layout saves should be debounced and merge changes by node resource reference instead of replacing the whole layout document. Concurrent edits to different nodes should both survive; concurrent edits to the same node may use last-write-wins for that node.

### Canvas Layout node saves send complete layout items

Each saved Canvas Layout node item should include the node reference, position, Canvas Node Expansion State when known, Canvas Node Stack Order when known, and resource identity snapshots such as last seen UID. The server may replace that node's saved layout item as a whole because concurrent edits to the same node are already last-write-wins.

### Orphan Canvas Layout items are retained temporarily

When a resource no longer appears in the detected graph, its Canvas Layout item should be hidden rather than deleted immediately. If the resource reappears, its layout is restored. Orphan layout items are purged after seven days.

### Canvas Layout is persisted in App Postgres

Canvas Layout belongs to the application persistence layer, not the Crossplane resource model. K8s and Crossplane remain the source of truth for Project, AP, DB, and EntryPoint resources; App Postgres stores the Project's visual arrangement.

### Canvas Layout is keyed by Project UID

Canvas Layout is identified by the Project's namespace and Kubernetes `metadata.uid`. The Project name may be stored as a display snapshot, but it does not define ownership because a Project can be renamed or recreated.

### Canvas connections are resource-backed

Users may freely drag lines between canvas nodes, but unsupported Connecting Edges are discarded after lightweight feedback. Established Canvas Connections are derived from AP, DB, and EntryPoint resource state rather than stored as separate App Postgres records.

### AP replica strategy belongs to AP desired state

Fixed Replicas and Elastic Scaling are both AP configuration, not one-off operational commands. The AP Settings UI should update AP desired state, and the platform should reconcile the underlying workload scaling resources from that state.

### AP replica strategy uses an explicit type

AP desired state should represent replica strategy with an explicit `resource.replicaStrategy.type` of `fixed` or `elastic`, rather than a boolean autoscaling flag. This keeps the meaning of fixed replica count, Elastic Scaling bounds, and future strategy variants separate.

Inactive replica strategy parameters may remain in AP desired state so users can switch strategies without losing their last-entered values, but only the branch selected by `resource.replicaStrategy.type` is reconciled. Inactive strategy parameters must not create or modify workload scaling resources.

### AP legacy replicas are a fixed-strategy fallback

Existing `resource.replicas` values are interpreted as Fixed Replicas only when `resource.replicaStrategy` is absent. New AP Settings writes should use `resource.replicaStrategy` as the canonical desired state.

### Elastic Scaling v1 is single-metric horizontal scaling

Elastic Scaling v1 has three user-facing choices: minimum replicas, maximum replicas, and one active scaling target. CPU targets use utilization percentage; Memory targets use an absolute average usage value such as `512Mi`. CPU and Memory capacity controls remain per-replica limits and are distinct from the Elastic Scaling target.

Elastic Scaling v1 uses AP-aligned replica bounds: minimum replicas and maximum replicas are each constrained to 1-20, with `minReplicas <= maxReplicas`. Defaults are 1 minimum replica, 10 maximum replicas, CPU as the target metric, and 80% CPU utilization. When users switch to Memory as the target, the UI should use an absolute memory value rather than a request-relative percentage.

### Elastic Scaling gives replica control to HPA

When an AP uses Elastic Scaling, the platform-managed horizontal autoscaler controls the Deployment replica count. The AP Composition should reconcile the autoscaler configuration and should not continuously force the Deployment to a fixed replica count.

### Elastic Scaling HPA is AP-composed

The horizontal autoscaler for Elastic Scaling is an optional AP-composed resource. It should be created, updated, and deleted by the AP Composition according to the active AP Replica Strategy, and should carry stable AP ownership metadata.

### Fixed Replicas has no HPA

When an AP uses Fixed Replicas, no horizontal autoscaler should remain for that AP. Switching from Elastic Scaling to Fixed Replicas should remove the platform-managed autoscaler and restore a fixed Deployment replica count.

### Database Binding belongs to AP desired state

The source of truth for a Database Binding is the AP's desired state. DB does not store reverse ownership of bound APs, and the canvas visualizes AP-DB connections detected from resource state.

### DB configuration changes are explicit updates

The DB configuration panel should collect changes as a DB Configuration Draft and apply them only when the user confirms the update. Sliders and switches inside the panel should not immediately mutate DB desired state.

### DB resource controls edit capacity limits

CPU and Memory controls in the DB configuration panel represent user-facing capacity limits, while resource requests remain driven by quota presets or platform defaults.

### DB configuration controls are schema-aligned

The selectable ranges and steps for DB configuration controls should align with DB schema or backend-provided DB configuration capabilities, not static Figma values. Until a backend capability exists, named UI constraints may be used when they are explicitly kept aligned with the DB XRD or product defaults.

### DB replica bounds belong to DB schema

DB replica controls should be backed by explicit minimum and maximum values on the DB XRD so UI sliders and API validation share the same product boundary. DB replicas are limited to 1-10 in v1.

### DB storage bounds are temporary UI constraints

Until DB configuration capabilities exist, DB storage controls may use named UI constraints and submit storage as a Kubernetes quantity string. Storage min, max, and step should not be inferred from Figma as API schema.

### DB public connection changes can be drafted

When changed inside the DB configuration panel, the Public Connection setting belongs to the same DB Configuration Draft and is applied only when the user confirms the update.

### DB canvas panel has explicit modes

Selecting a DB node opens the DB configuration panel, while DB quick actions may switch the same right-side panel surface to another mode such as metrics.

### DB configuration panel identifies the DB workload

The DB configuration panel header should use the DB name as its title, engine/version as supporting context, and the DB lifecycle status as the status indicator.

### Database Binding v1 is expressed through AP environment variables

Database Binding v1 is represented by one or more AP `spec.input.env` entries. Environment variable names are user-provided and unique within one AP; removing a binding entry removes the corresponding environment variable row.

### Database Binding is authored from the Environment editor

Database Binding v1 is created through the AP Environment editor. The structured editor lets users add ordinary environment values or use Add Reference to select a Project DB field such as Private DSN, Public DSN, Username, Password, Host, or Port.

### Add Reference stores standard Kubernetes env

After an Add Reference row is saved, AP desired state stores only standard Kubernetes environment variables. DSN references become ordinary `value` entries, primitive fields become `valueFrom.secretKeyRef` entries, and no separate reference metadata is persisted.

### Environment editor reconstructs DB references from exact evidence

When editing existing AP environment variables, the Environment editor displays a row as a Project DB reference only when the saved env has exact evidence: a Secret reference to a DB credential Secret, or a value equal to a DB private or public DSN. Otherwise the row is shown as an ordinary value.

### Canvas Database Binding delegates to Environment editor

Dragging between an AP and a DB in either direction opens the AP Environment editor's add-variable flow with Add Reference preselected for that DB. Repeated AP-DB drags may add another environment variable referencing a different field from the same DB.

### External databases are ordinary Environment variables

External database credentials are not modeled as Database Bindings in v1. Users enter external database values directly in the AP Environment editor, and the product does not create a separate external database form, node, or Canvas Connection for them.

### Canvas telemetry is store-mediated

Canvas workload nodes should not wait for a full-project telemetry batch before rendering metrics. Workload discovery (AP, DB, EntryPoint lists) and Workload Telemetry Series refresh have different lifecycles.

Canvas nodes consume workload telemetry through a shared telemetry store rather than each node owning an independent polling loop. The first version treats mounted canvas nodes as eligible telemetry consumers and prioritizes the selected workload, without requiring viewport visibility calculation. For compact canvas summaries, the store batches mounted workload targets into snapshot requests so nodes can update independently while the network layer avoids one request per node.

Canvas telemetry snapshots use instant telemetry queries and return only the latest sampled metric values. Snapshot requests do not carry a sampling window. Detailed metrics panels request one workload at a time and use range telemetry queries with `start`, `end`, and `step` when they need a Workload Telemetry Series.

### Custom domain implementation is deferred

Custom Domain desired-state shape and resource ownership are intentionally deferred until DNS verification and certificate infrastructure are designed. Implementation requires cert-manager + Let's Encrypt infrastructure that is not yet deployed. Platform-assigned domains use a wildcard certificate (`wildcard-cert`) and do not need per-domain certificate management.

### Project Aggregate Status is derived from AP and DB phases, not from Project conditions

The Project composite's `status.conditions[Ready]` reflects only whether the Project composition itself reconciled; under the current composition it is True almost as soon as the Project is applied (the composition annotates its composed Instance with `gotemplating.fn.crossplane.io/ready: "True"`), so Project Ready by itself does not tell users whether the workloads inside the project are running. The project list therefore derives Project Aggregate Status from the phases of the project's APs and DBs (the workloads users care about), grouped by the `crossplane.io/project-uid` label that AP and DB compositions write on their composed resources.

### Project Aggregate Status uses the canvas 5-tone visual scale

Project Aggregate Status uses the same `positive | progress | warning | negative | neutral` scale as canvas node status (`packages/ui/src/components/canvas-node/canvas-node.status.tsx`), not the raw 4-color phase scale in `crossplane-status-schema.ts`. This keeps "creating / progressing" workloads blue in both surfaces; using the 4-color scale would color the same in-progress workload yellow on the list and blue on the canvas.

### Project Aggregate Status uses max-severity aggregation

Project Aggregate Status is the worst tone among the project's APs and DBs, with severity ordered `negative > warning > progress > positive > neutral`. Any failing workload promotes the project to negative; any in-progress workload promotes it to progress; only when every workload is positive does the project go positive. Paused workloads contribute as `neutral`, so a paused workload alongside a running one leaves the project positive, not progress.

### Empty and loading project rows render a neutral dot, not a hidden cell

Projects with no APs or DBs, and projects whose AP/DB lists have not loaded yet, render a static neutral dot rather than hiding the status indicator. Hiding the dot would shift the row's `name` baseline and would also remove the visual affordance that the row has a status. The neutral dot is static (no breathing) to distinguish it from active workload tones.
