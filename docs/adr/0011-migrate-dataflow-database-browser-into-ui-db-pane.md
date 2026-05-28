# Migrate the DataFlow Database Browser into the UI Database Pane

The project UI will host the migrated DataFlow database browser inside the existing database node action surface in `apps/ui`. A database node action opens the pane; the pane receives the selected database service, project UID, namespace, and kubeconfig from the existing project canvas context. This is not a standalone app, not a new frontend inside `apps/whodb`, and not a rewrite of the database browser interactions.

The migration preserves DataFlow's database browser interaction details by moving the relevant frontend code into `apps/ui/src/features/data-browser/`. Hidden future capabilities are migrated into `src` and must compile, but their UI entry points stay disabled through a feature-local capability configuration. Deleted capabilities are not migrated.

## Decisions

- Use `apps/ui/src/features/data-browser/` as the feature boundary for the migrated frontend.
- Mount the visible product surface from the existing `dbAccess` canvas action pane.
- Treat the browser as a single selected database service browser. The host pane passes project UID, namespace, kubeconfig, selected database workload name and namespace, display name, engine, and version. The migrated browser does not expose an internal connection or service switcher.
- Use `selectedDatabaseData.workload.name` as the DB claim path parameter and `selectedDatabaseData.workload.namespace` as the access request namespace. The page namespace remains host context, but access requests target the selected DB workload namespace.
- Disable the `dbAccess` action in preview/share mode. The first version requires the normal project page kubeconfig context and does not add a share-token database content access path.
- Keep DataFlow browser UI behavior by copying and adapting components instead of rebuilding the interface with the shared UI library.
- Preserve the original DataFlow directory relationships, provider/store relationships, and component coupling as much as possible. Do not pre-split the migration into a new clean read-only architecture because that would turn the migration into a rewrite.
- Use a feature-local import alias such as `@data-browser/*` for migrated DataFlow internals. Mechanically rewrite old DataFlow `@/*` imports to the feature alias instead of mixing migrated internals into the app-wide `@/*` namespace.
- Move only the database-browser-required global styles into a feature-local stylesheet such as `features/data-browser/data-browser.css`. Scope migrated variables and utilities under a data-browser root class instead of copying DataFlow `:root`, `body`, font-face, or deleted react-grid-layout styles into the app global stylesheet.
- Use feature-local DataFlow UI primitives for the migrated browser instead of replacing them wholesale with `@workspace/ui` primitives. The outer canvas action surface may keep using the existing shared UI components.
- Keep DataFlow's `AlertModal`, `ConfirmationModal`, and `ModalForm` alert behavior as feature-local UI behavior. Do not replace those interactions with the host app toast system during the migration.
- Allow color changes only through a data-browser scoped theme that overrides CSS variables. Do not use the migration to retune component layout, spacing, density, radius, table structure, modal structure, or toolbar composition in TSX unless required for pane integration or compilation.
- Add a feature-local `capabilities.ts` as the first-version visibility boundary. Use it at entry layers such as context-menu item construction, toolbar action rendering, and tab-opening paths; do not spread capability checks through deep migrated components unless required for compilation.
- Delete the original DataFlow login, standalone session, Sealos bootstrap, and multi-connection management flows.
- Delete the Analysis/Dashboard/chart product area, including dashboard CRUD, chart creation, chart editing, and ECharts dashboard rendering.
- Remove chart creation imports, buttons, and modal entry points from migrated database/editor code. Chart creation belongs to the deleted Analysis/Dashboard/chart product area, not to hidden database-browser capabilities.
- Delete the standalone DataFlow app shell as a product surface; reshape only the database browser shell to fit the canvas action pane.
- Keep multi-database browsing inside the selected database service because a single database service can expose multiple databases.
- Use the backend returned `AccessObjectRef { kind, path }` as the canonical object identity for the object tree, tabs, rows, columns, and export. Legacy fields such as database, schema, table, collection, or key names are derived compatibility values only.
- Deduplicate object tabs by canonical `AccessObjectRef`; opening the same object ref activates the existing tab instead of creating a duplicate.
- Keep PostgreSQL, MySQL, MongoDB, and Redis visible in the first version.
- Hide unsupported WhoDB engine types rather than deleting their future integration path.
- Show only object kinds already covered by the migrated DataFlow browser content model in the first version: `database`, `schema`, `table`, `view`, `collection`, and `key`.
- Hide non-DataFlow content object kinds returned by WhoDB access, including `index`, `item`, `function`, `procedure`, `trigger`, and `sequence`.
- Preserve the DataFlow tree grouping model for PostgreSQL by showing virtual `Tables` and `Views` folders under schema nodes. These folders use the schema ref plus a kind filter; they are not canonical database objects.
- Preserve the DataFlow tree grouping model for Redis by showing a virtual `Keys` folder under Redis database nodes. The folder is a UI grouping node and is not a canonical database object.
- Hide SQL, Mongo, and Redis query editors. Their code can compile in the feature, but there is no visible entry point in the first version.
- Hide write and structure-changing capabilities, including create, rename, copy, clear, delete, inline edit, row/document/key creation, and row/document/key deletion flows.
- Hide backend filtering and advanced query-backed filtering. Keep the DataFlow FindBar as client-side find and highlight over the currently loaded rows or documents, but do not wire the FindBar search term into backend `where`, filter, or search requests in the visible first version.
- Hide the Show/Hide System Objects control rather than deleting it. The first version shows whatever the WhoDB access API returns because the current app API does not expose system schema metadata or system object include/exclude controls.
- Keep read-only browsing visible: object tree, multi-tab browsing, rows and columns, pagination, column resizing, column visibility, loading, error, and empty states.
- Keep SQL table/view and Redis key column sorting visible where the backend supports the rows sort model. Hide Mongo collection sorting in the first version.
- Keep SQL table/view and Redis row selection hidden in the first version because selection only serves hidden mutation or selected-row export flows.
- Keep MongoDB collection browsing in DataFlow's document list/card view rather than converting it to a table.
- Keep explicit copy-cell actions out of the first version. Preserve normal text selection and browser-native copy behavior.
- Keep the DataFlow lazy object tree expansion behavior. On first open, render the selected service/root and fetch children only when the user expands a node.
- Preserve expanded tree state in localStorage, scoped by project and selected database service so different services do not share expansion state.
- Keep right-click context menus visible only for safe first-version actions: Refresh on expandable nodes and Refresh plus single-object Export on table, view, collection, and Redis key nodes.
- Keep single-object export visible through a lightweight modal that offers backend-supported safe formats only.
- Keep single-object export implemented through the existing app API access export endpoint, using backend file headers such as `Content-Disposition` for downloads.
- Hide complex export options such as SQL export, Excel export, JSON export when not backend-supported, WHERE filters, Mongo filters, frontend query-backed export, row-limit controls, selected-row export, and whole-database ZIP export.
- Keep Zustand as feature-local state for the migrated DataFlow code in the first version. Do not migrate the browser state to Jotai yet.
- Use existing `apps/ui` Jotai state only for host context such as kubeconfig, namespace, project UID, and selected database service.
- Delete DataFlow i18n from the migrated feature. Do not move the Chinese locale, do not keep a feature-local translator shim, and do not mount a DataFlow `I18nProvider` or language switcher.
- Use direct English strings in migrated DataFlow components until the product makes a project-wide i18n decision. Future localization should be introduced through the app-level i18n architecture rather than a data-browser-local compatibility layer.
- Use an `apps/api` REST adapter for the visible read-only data path.
- Authenticate visible REST adapter requests with the host kubeconfig using the existing app API bearer format: `Authorization: Bearer ${encodeURIComponent(kubeconfig.trim())}`. Do not migrate DataFlow's old session token, session storage, Sealos bootstrap, or auth store behavior.
- Have the visible REST adapter convert `AccessRowsResult` into DataFlow-compatible table data shapes where that reduces component changes. Requests still use canonical `AccessObjectRef`.
- Keep visible rows and export requests aligned with the current app API schema. Rows requests send only ref, pagination, and supported sort; export requests send only ref and the backend-supported `csv` or `ndjson` format. Do not send hidden `query`, `where`, `filter`, selected rows, or query-backed export payloads from the visible path.
- Keep the original DataFlow connection-store surface where it reduces migration changes, but rewire its internals to a single host-provided selected database service and the REST adapter instead of old auth or GraphQL connection management.
- Keep visible read-only components off legacy Apollo hooks. Object tree, table/view rows, Mongo rows, Redis rows, and export modal must use the REST adapter.
- Keep Apollo and generated GraphQL hooks as a feature-local legacy layer for migrated hidden code. Do not expose a global `@graphql` alias and do not mount ApolloProvider globally.
- Do not migrate DataFlow's GraphQL codegen toolchain, codegen config, or `.graphql` operation workflow. Keep the already generated GraphQL TypeScript as feature-local legacy compile support for hidden code only.
- If hidden legacy GraphQL features are re-enabled later, add any required Apollo provider inside the data-browser feature boundary rather than globally.
- Install dependencies needed by migrated non-deleted code that remains in `src`, including hidden compile-only code.
- Do not install dependencies that are only required by deleted product areas such as Analysis/Dashboard/chart or deleted login/bootstrap code.
- Hidden capabilities only need to pass typecheck, lint, and build while hidden. They do not need to be runtime-functional until their entry points are re-enabled.
- Hidden write, query, filtering, and complex export components may stay in the feature, but they must have no visible first-version callers. Visible toolbars and context menus render only safe first-version actions such as refresh, single-object export, column visibility, find, and pagination.
- Keep the hidden Monaco query editor compileable, but do not configure Next.js static Monaco assets or copy Monaco workers in the first version.
- Do not migrate DataFlow's Vitest test suite. Add or keep focused `apps/ui` tests for the migration-specific contracts instead, including REST adapter mapping, engine mapping, feature gating, tree grouping, and preview/share `dbAccess` disabling.
- Allow narrow Biome/Ultracite overrides for `apps/ui/src/features/data-browser/**` when style, naming, or complexity rules would force broad rewrites of migrated DataFlow components. Do not override TypeScript compilation, unused code, real React hooks correctness issues, or visible-entry safety checks.

## Considered Options

- Rebuild the database browser UI from scratch in `apps/ui`: rejected because the existing DataFlow browser contains many interaction details that should be preserved.
- Add a frontend surface to `apps/whodb`: rejected because `apps/whodb` is a backend-only service and the browser belongs in the product UI.
- Enable database content browsing in preview/share mode: rejected for the first version because the existing app API access endpoints use kubeconfig bearer authorization and share-token database access would be a separate permission-model change.
- Migrate only the visible first-version code and keep hidden features outside `src`: rejected because future hidden capabilities should remain close to the migrated browser code and preserve implementation detail.
- Migrate all DataFlow frontend areas: rejected because login, multi-connection management, and Analysis/Dashboard/chart features are outside the desired product boundary.
- Convert DataFlow Zustand stores to Jotai during the migration: rejected for the first version because it increases migration risk without being required for the pane integration.
- Preserve DataFlow i18n: rejected because the first version should use English by default and should not carry the Chinese locale or DataFlow i18n framework.
- Copy DataFlow global CSS wholesale into the app global stylesheet: rejected because it would leak DataFlow root variables, body rules, fonts, and deleted product styles into the rest of `apps/ui`.
- Wire visible browsing through legacy GraphQL and Apollo: rejected because the brainv2 backend already exposes the read-only WhoDB access path through `apps/api`.
- Migrate DataFlow GraphQL code generation into `apps/ui`: rejected for the first version because visible browsing uses REST and hidden GraphQL code only needs compile-time compatibility.
- Replace all DataFlow primitives with `@workspace/ui` primitives during migration: rejected because it would alter behavior and expand the migration into a UI rebuild.
- Configure Monaco runtime assets while the query editor is hidden: rejected because hidden features only need to compile in the first version.
- Migrate the original DataFlow Vitest suite wholesale: rejected because many tests target deleted login, auth, i18n, analysis, dashboard, or Vite app-shell behavior.
- Refactor migrated DataFlow components broadly just to satisfy style-only lint rules: rejected because it would risk changing preserved interactions. Narrow feature-local lint overrides are acceptable where they protect migration fidelity.

## Consequences

The migrated feature will be heavier than a minimal first-version implementation because hidden code and its dependencies live in `src` and must compile. In return, future reactivation of query, write, and advanced export capabilities can start from the preserved DataFlow implementation instead of rediscovering UI behavior.

The visible first version remains a read-only database browser tied to the selected database service in the project canvas. It uses the app API access endpoints for object listing, object metadata, columns, rows, and export. Hidden legacy GraphQL code is isolated inside the data browser feature and must not leak providers, aliases, or runtime assumptions into the rest of `apps/ui`.

Deleted capabilities are intentionally absent from the migrated feature. In particular, Analysis/Dashboard/chart functionality is deleted rather than hidden.

Because visible browsing uses `AccessObjectRef` as canonical identity, UI state such as selected tree item, opened tabs, and active row/export requests can remain stable across database engines without reintroducing per-engine object identity guesses.

Because color changes are limited to scoped CSS variable overrides, the migrated browser can visually fit the brainv2 pane while preserving the DataFlow component structure and interaction density.
