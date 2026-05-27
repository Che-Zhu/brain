# DB Access Workbench Provenance

DB Access Workbench is intentionally derived from the local DataFlow browsing source at:

`/Users/sealos/Documents/GitHub/dataflow/dataflow`

The authoritative DataFlow source was confirmed during the HITL foundation issue on 2026-05-27. The first migration target is DataFlow's browsing spine: object references, capability gates, tabs, object tree, read-only data views, pagination, find/filter affordances, export controls, host events, and snapshots.

This module follows `docs/adr/0011-adopt-dataflow-derived-db-access-workbench.md`. Preserve DataFlow-aligned browsing interaction and visual language where it applies to read-only DB Access. Do not replace the Workbench with a simplified custom viewer without revisiting ADR 0011.

Brainv2 replaces DataFlow app-level assumptions with a host boundary:

- No DataFlow routing, Apollo session state, or direct browser-to-WhoDB access.
- No Kubernetes credentials, raw database credentials, WhoDB operation details, or DataFlow session state in the Workbench contract.
- Browser code talks to a small `DbAccessAdapter`; the brainv2 adapter calls the DB Access API so Project ownership, namespace handling, DB readiness, credential loading, row caps, and export caps remain server-side.
- V1 is read-only: browse, rows, and export are enabled; query, write, dashboard, and assistant linkage capabilities are disabled.
