# Scope Data Browser state to a DB Access Session

The migrated DataFlow database browser originally kept its Zustand stores as feature-local state to reduce migration risk, but the main UI state model is now Jotai-based and the leftover stores make the DB Access pane behave like an isolated legacy island. We will replace the migrated browser's direct Zustand stores with a feature-local Jotai scope owned by the DB Access pane, while continuing to receive host context such as project UID, namespace, kubeconfig, and selected DB Service from the Project Canvas.

The feature-local state represents one DB Access Session for one DB Service: object selection, open tabs, active tab, and refresh counters stay alive while browsing multiple Logical Databases inside that service, but closing DB Access or switching to another DB Service starts a new session. The sidebar keeps a `db_service` root node to express that DB Service boundary, but the core model no longer carries DataFlow's old multi-connection `Connection[]` state. We will not put object tabs or active object selection into the URL in this change, and we will keep hidden legacy DataFlow code compileable through the new feature state API rather than deleting hidden capabilities as part of the state migration.

## Considered Options

- Keep the migrated Zustand stores: rejected because ADR 0011 treated them as a first-version migration compromise, and leaving them in place keeps Data Browser state management inconsistent with the rest of `apps/ui`.
- Keep a Jotai-backed compatibility model named `Connection` or `connections`: rejected because DB Access is scoped to one DB Service, and preserving DataFlow's old multi-connection language would hide the product boundary we are trying to make explicit.
- Put Data Browser atoms in the app-wide default Jotai store: rejected because DB Access is a resource-scoped workflow whose internal browsing state should be separated from Project Canvas and assistant state.
- Deep-link object tabs and active object selection in the URL: rejected for this migration because URL semantics for database objects, missing objects, permission changes, and tab stack restoration should be a separate product decision.
- Delete hidden legacy DataFlow query, write, and complex export code during the state migration: rejected because hidden capability deletion is a product and maintenance decision separate from replacing the state framework.

## Consequences

`apps/ui` should no longer depend directly on Zustand for Data Browser state, although transitive dependencies may still bring Zustand through other libraries. Data Browser components should use feature-specific state hooks rather than `useConnectionStore` or `useTabStore`, and core state/types should use DB Service language such as `dbServiceKey` and `db_service` instead of `connectionId` and `connection`, making the DB Access Session boundary explicit in code.
