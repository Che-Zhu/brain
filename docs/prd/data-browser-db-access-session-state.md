# PRD: Replace Data Browser Zustand Stores with Scoped DB Access Session State

## Problem Statement

The migrated DataFlow database browser still carries a feature-local Zustand store model and DataFlow's old multi-connection language. This makes the DB Access pane feel like a legacy island inside the main UI, whose state management is otherwise Jotai-based and whose product model is centered on Project Canvas DB Services.

The current migrated state model also blurs product terms. The browser is opened for one DB Service from the Project Canvas, but core state and component props still talk about connections, connection IDs, and connection arrays. That language makes future work harder because it hides the actual DB Access boundary: one DB Access Session for one DB Service, with multiple Logical Databases browsable inside that service.

## Solution

Replace the Data Browser's direct Zustand stores with a feature-local Jotai scope owned by the DB Access pane. Model internal state as a DB Access Session rather than as a multi-connection browser. The Project Canvas remains responsible for selecting the DB Service and opening DB Access; the Data Browser owns object tree selection, open tabs, active tab, and refresh signals inside the session.

The sidebar should retain a DB Service root node, named `db_service` in core types, to express the DB Service boundary. Within that DB Service, users can browse multiple Logical Databases and keep tabs open across those Logical Databases. Closing DB Access or switching to another DB Service starts a new DB Access Session.

Hidden legacy DataFlow query, write, filtering, and complex export code should remain in the codebase and continue to compile, but it should consume the new feature state API rather than preserving a Jotai-backed compatibility model named `Connection` or `connections`.

## User Stories

1. As a Project Canvas user, I want DB Access to open for the DB Service I selected, so that I inspect the intended database workload.
2. As a Project Canvas user, I want DB Access internals to be scoped to the selected DB Service, so that state from another DB Service does not leak into my current browser.
3. As a DB Access user, I want the sidebar to show a root node for the DB Service, so that I understand the boundary of the database service I am browsing.
4. As a DB Access user, I want to expand the DB Service root node to discover Logical Databases and objects, so that I can inspect data lazily without loading everything up front.
5. As a DB Access user, I want to open tables from one Logical Database and collections or keys from another Logical Database within the same DB Service, so that I can compare objects exposed by the same service.
6. As a DB Access user, I want object tabs to remain open while I browse multiple Logical Databases inside the same DB Service, so that I do not lose my working context.
7. As a DB Access user, I want opening the same object again to activate the existing tab, so that I do not accumulate duplicate tabs.
8. As a DB Access user, I want object tab identity to be based on canonical AccessObjectRef identity, so that tab behavior is stable across supported engines.
9. As a DB Access user, I want closing DB Access to end the current browsing session, so that reopening starts clean instead of restoring stale object tabs.
10. As a DB Access user, I want switching from one DB Service to another DB Service to start a new session, so that objects from the previous service are not shown in the new service's browser.
11. As a DB Access user, I want tree expansion state to remain remembered per DB Service, so that returning to the same service can restore lightweight navigation context.
12. As a DB Access user, I want tree expansion state for one DB Service not to affect another DB Service, so that navigation state remains resource-scoped.
13. As a DB Access user, I want refresh actions to affect the current DB Access Session, so that visible objects and rows can be reloaded without global side effects.
14. As a DB Access user, I want unsupported engine handling to remain unchanged, so that unsupported DB Services show the existing safe empty state.
15. As a DB Access user, I want visible read-only browsing behavior to remain unchanged, so that the state migration does not rewrite product interactions.
16. As a DB Access user, I want single-object export to remain available for supported object kinds, so that existing safe export workflows continue to work.
17. As a DB Access user, I want query, write, backend filtering, and complex export entry points to remain hidden, so that the first-version DB Access surface stays read-only.
18. As a frontend engineer, I want Data Browser state to use feature-local Jotai state, so that it aligns with the main UI while keeping DB Access isolated from Project Canvas and assistant state.
19. As a frontend engineer, I want the Data Browser not to read app-wide Jotai atoms directly, so that host context remains an explicit boundary passed into the feature.
20. As a frontend engineer, I want Data Browser state types to use DB Service language, so that code reflects the product glossary instead of migrated DataFlow connection concepts.
21. As a frontend engineer, I want `connectionId` and `connection` vocabulary removed from core Data Browser state and visible props, so that future readers do not mistake the feature for a multi-connection browser.
22. As a frontend engineer, I want hidden legacy code to compile through the new state API, so that future capabilities are not accidentally deleted during this migration.
23. As a frontend engineer, I want no direct Zustand dependency for Data Browser state, so that `apps/ui` no longer carries Zustand solely for the migrated browser.
24. As a frontend engineer, I want tests around session state behavior, so that the DB Service boundary is protected from regressions.
25. As a frontend engineer, I want tests around canonical object tab deduplication, so that the migration preserves important browsing behavior.
26. As a frontend engineer, I want tests around the DB Service root node and scoped tree expansion key, so that the new terminology is not just cosmetic.
27. As a future product owner, I want this migration not to block future multi-source browsing, so that a later External Database Connection concept can be introduced intentionally if needed.

## Implementation Decisions

- Use the glossary terms DB Service, Logical Database, DB Access, and DB Access Session consistently.
- DB Access Session means one active browsing session for one DB Service. It includes object selection, open object tabs, active tab, and refresh counters.
- A DB Access Session keeps object selection and open tabs while browsing multiple Logical Databases inside the same DB Service.
- Closing DB Access or switching to another DB Service starts a separate DB Access Session.
- Do not store object tabs or active object selection in the URL in this migration. The URL continues to express the outer Project Canvas selection and DB Access surface only.
- Replace direct Data Browser Zustand stores with a feature-local Jotai scope owned by the DB Access pane.
- Do not put Data Browser internal atoms in the app-wide default Jotai store. DB Access should be a resource-scoped workflow separated from Project Canvas and assistant state.
- The Project Canvas provides host context to DB Access, including project UID, namespace, kubeconfig, selected DB Service workload name and namespace, engine, display engine, and formatted version.
- Data Browser internals should not read app-wide host atoms directly. Host data should flow through the existing runtime/host context boundary.
- Remove the old DataFlow multi-connection core model from Data Browser state. Do not preserve a Jotai-backed `Connection` type or `connections` array as a compatibility layer.
- Keep a DB Service root node in the sidebar. In core types, use the root node kind `db_service`.
- Use `dbServiceKey` as the stable identifier for the current DB Service in Data Browser state and component props.
- Prefer DB Service language in core state, tree, tab, visible component props, tests, and QA attributes.
- Rename core `connectionId` usages to `dbServiceKey` where they describe the current DB Service/session identity.
- Rename tree root semantics from `connection` to `db_service`.
- Rename tab state so tabs belong to the current DB Access Session and do not carry a connection identity as their primary product boundary.
- Preserve canonical object tab deduplication by AccessObjectRef.
- Preserve DB Service scoped localStorage for expanded tree state, using project UID plus DB Service workload namespace and name.
- Preserve lazy object tree loading. Opening DB Access should not eagerly fetch all child objects.
- Preserve visible read-only browsing behavior for supported PostgreSQL, MySQL, MongoDB, and Redis engines.
- Preserve visible single-object export through the existing read-only access adapter path.
- Preserve hidden legacy query, write, backend filtering, and complex export code as compile-only code. Do not delete these capabilities as part of this migration.
- Hidden legacy code should use the new feature state API. Avoid keeping old store names solely for hidden code.
- Generated GraphQL types and old external schema names do not need to be renamed if they are part of the hidden legacy layer or external contracts.
- Remove the direct `zustand` dependency from the UI package if it is no longer used directly after the migration. The lockfile may still contain Zustand transitively through other libraries.
- Update documentation and tests to reflect DB Access Session, DB Service root node, and removal of old connection-state language.

Major modules to build or modify:

- A feature-local DB Access Session state module that defines atoms, provider scope, and hooks for selected object, tabs, active tab, and refresh counters.
- A pure tab/session state module that can be tested without React, especially for tab opening, deduplication, activation, closing, and DB Service session reset behavior.
- A DB Service identity helper that derives a stable `dbServiceKey` from host context.
- Sidebar tree types and provider logic that use `db_service` root nodes and `dbServiceKey`.
- Layout tab components that consume the new state hooks and no longer rely on `useTabStore`.
- Visible table, collection, Redis key, export, and toolbar components that receive `dbServiceKey` instead of `connectionId` where the prop refers to the DB Service/session.
- Hidden legacy components that currently import old stores, updated to compile against the new feature state API.
- Package metadata, removing direct Zustand usage when no direct imports remain.

Deep module opportunities:

- DB Access Session reducer/helpers: encapsulate tab open/close/update behavior, active tab selection, and canonical AccessObjectRef deduplication behind a small testable interface.
- DB Service identity helper: encapsulate session key derivation and scoped storage key derivation so components do not hand-build identity strings.
- Tree node adapter: encapsulate AccessObject-to-tree-node conversion, DB Service root node creation, and virtual folder node generation.

## Testing Decisions

- Tests should focus on external behavior rather than Jotai implementation details. The goal is to prove session semantics, tab behavior, and tree identity, not atom internals.
- Add or update tests for DB Access Session tab behavior: opening an object tab, deduping by AccessObjectRef, activating an existing object tab, closing active tabs, closing all tabs, and rejecting hidden query tabs while the query capability is disabled.
- Add or update tests for DB Service session reset behavior: a new DB Service key starts a fresh session; the same DB Service key preserves session state while the pane remains mounted.
- Add or update tests for DB Service root tree behavior: the root node uses `db_service`, child loading starts from the DB Service root, and object nodes use `dbServiceKey`.
- Add or update tests for scoped expanded tree storage: the key is scoped by project UID, DB Service workload namespace, and DB Service workload name.
- Add or update tests for visible layout rendering with the new state provider, similar to the existing layout tooltip/context smoke test.
- Add or update tests proving no direct Data Browser Zustand imports remain.
- Update existing store-focused tests into state-module tests rather than deleting their behavioral coverage.
- Reuse prior art from the existing Data Browser tests for access adapter mapping, engine mapping, capability gating, tree grouping, tab deduplication, and layout smoke rendering.
- Before claiming implementation complete, run the repo's standard UI validation commands from the repo root: typecheck and code check. Run focused Data Browser tests as well.

## Out of Scope

- Do not add URL deep links for object tabs, active object selection, or Logical Database selection.
- Do not persist open tabs across closing and reopening DB Access.
- Do not add a global multi-DB-Service workspace.
- Do not support user-created external database connections in this change.
- Do not delete hidden legacy query, write, filtering, or complex export code.
- Do not re-enable hidden query, write, filtering, or complex export UI entry points.
- Do not replace DataFlow UI primitives with shared UI primitives as part of this state migration.
- Do not redesign visual density, spacing, toolbar structure, table structure, or modal behavior.
- Do not change backend access API contracts.
- Do not change preview/share mode behavior for DB Access.
- Do not migrate generated GraphQL schemas or regenerate legacy GraphQL code.
- Do not attempt to remove transitive Zustand references from the lockfile when they come from unrelated dependencies.

## Further Notes

- This PRD follows the domain language captured in the Domain Context: DB Service, Logical Database, DB Access, and DB Access Session.
- This PRD intentionally revisits ADR 0011, which kept Zustand as a first-version migration compromise.
- ADR 0012 records the new architectural decision: scope Data Browser state to a DB Access Session and replace the migrated Zustand stores with a feature-local Jotai scope.
- The implementation should leave the Data Browser as a single selected DB Service browser. Future multi-source browsing should introduce a deliberate new product concept rather than reviving the migrated DataFlow connection model.
- The direct package dependency on Zustand should disappear only if code no longer imports it directly. A transitive dependency through unrelated libraries is acceptable.
