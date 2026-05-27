# Port the DataFlow Database Browsing UI for DB Access

DB Access will be implemented by porting DataFlow's database browsing UI into a brainv2 feature module, hosted by the project canvas through a thin host adapter. The workbench owns the ported DataFlow browsing layout, interaction model, and visual language; the canvas host owns resource selection, route state, auth, and Project/DB context. This preserves the actual database browsing experience instead of recreating a lookalike viewer, while avoiding a direct dependency on DataFlow's app shell or runtime sessions.

## Considered Options

- Build a minimal brainv2-specific DB viewer: rejected because it would lose DataFlow interaction and visual parity, and would invite future simplified reimplementations.
- Recreate the DataFlow experience with generic brainv2 or shadcn-style components: rejected because a functional approximation still changes the product surface the user explicitly wants to preserve.
- Embed or import DataFlow as a whole app: rejected because it would couple brainv2 to DataFlow's session, routing, and runtime assumptions instead of letting the canvas own the DB Access host context.
- Let the browser connect directly to WhoDB/Apollo using DataFlow's session model: rejected because DB Access credentials, Project ownership checks, and namespace context belong behind the brainv2 API boundary.
- Put the workbench in `apps/ui/src/lib`: rejected because the workbench is a product feature with navigation, views, state, capabilities, and adapter boundaries, not a helper library.
- Create a shared package immediately: rejected for v1 because brainv2 is the only current in-repo consumer and the adapter contract should settle before promotion.

## Consequences

The workbench should live under `apps/ui/src/features/db-access-workbench` until there is a second real consumer, at which point it can be promoted to a package such as `packages/db-workbench`. Project canvas code under `apps/ui/src/lib/project-canvas/actions` should only provide the Canvas Action Surface host, adapter wiring, and mounting boundary; object trees, tabs, data views, and workbench state belong to the feature module.

Ported DataFlow components should carry explicit provenance documentation in the workbench directory. The provenance should state that direct visual and interaction parity with DataFlow's browsing experience is intentional, so future changes do not replace the workbench with a simplified viewer or generic component rewrite unless this ADR is revisited.

Migration should port DataFlow's browsing workbench UI and spine, not merely reproduce the idea. Object tree, tab bar, table/document/Redis views, toolbar/find/filter/export affordances, empty/loading/error states, object references, tab model, view model, capability gates, host events, and data views should move as coherent workbench concepts while app-level assumptions such as DataFlow routing, Apollo session state, and direct WhoDB access are replaced by the brainv2 host adapter.

The browser-facing workbench should depend on a `DbAccessAdapter` interface, not on WhoDB, Apollo, Kubernetes credentials, or DataFlow session state. The brainv2 host adapter should satisfy that interface through the existing DB Access API endpoints so credential handling and Project ownership checks remain server-side.

Future assistant linkage should use explicit workbench host events and snapshots, such as selected object, loaded rows, visible data, and export intent. The Project Assistant Pane should consume those host-level signals instead of reaching into the workbench's internal store.

V1 DB Access should port all DataFlow database browsing UI that is compatible with read-only DB Access: object browsing, tabs, table/document/Redis key views, pagination, find, filters, export, and their surrounding layout and states are in scope. Query Editor is the only named parked DataFlow database feature, not v1 runtime code; if added later, it should enter through `capability.query` and a query adapter such as `DbQueryAdapter.runQuery`. Dashboard and BI surfaces are out of scope for brainv2 rather than parked migration targets, and chart/dashboard entry points from DataFlow should be removed or capability-gated off in brainv2. Data mutation and DDL entry points from DataFlow should disappear from the v1 UI rather than remain visible as disabled controls, but their removal must not be used as permission to redesign the rest of the browsing UI. Future write actions or assistant linkage must be added as explicit workbench capabilities and adapter methods rather than hidden assumptions in reused DataFlow components.

Find and filter should preserve DataFlow's browsing interaction where possible, but must remain within the DB Access read contract. V1 should use structured read-only filtering, sorting, and pagination parameters rather than exposing arbitrary SQL predicates or raw query execution through the browsing path.

Export should also go through the brainv2 DB Access API rather than a separate browser-side data path. The workbench may present export controls and local current-page conveniences, but full export reads must continue to use the host adapter so ownership checks, read-only limits, row caps, and credential hiding remain server-side.
