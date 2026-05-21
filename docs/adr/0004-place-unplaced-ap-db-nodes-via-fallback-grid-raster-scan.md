# Place Unplaced AP and DB Nodes via Fallback Grid Raster-Scan

When an AP or DB node is detected with no saved Canvas Layout entry, place it at the first 340×280 grid slot (3 columns from origin, then row by row) whose rectangle does not intersect any already-allocated node rectangle. The slot search is a pure function of the saved Canvas Layout plus the currently detected nodes; viewport state is never an input to placement.

## Considered Options

- **Pure list-index fallback (today's behavior).** Rejected because the index is derived from K8s list order, can change between fetches, and produces collisions with positions a user has already saved by dragging.
- **Anchor each new node at the canvas-space AABB right-of or below existing nodes.** Rejected because once the canvas spans several screens, new nodes land far from everything else and lose visual coherence; the raster-scan reuses the original fallback-grid neighborhood that the rest of the canvas already extends from.
- **Use the creator's viewport center as the saved position (viewport-aware placement).** Rejected for two reasons: (a) external triggers (kubectl, Crossplane) have no creator viewport at all, so this path would need a second algorithm anyway; (b) conditioning persisted geometry on a transient per-user viewport breaks the Project-shared Canvas Layout contract — the same node would land in different canvas positions depending on who triggered it.
- **Encode placement in the K8s resource spec (`spec.suggestedPosition` or similar).** Rejected because Canvas Layout lives in App Postgres while K8s/Crossplane is the resource source of truth (ADR-0001); pushing layout into the resource spec would cross that boundary.

## Consequences

- Multiple unplaced nodes detected in the same render are placed in `kind:namespace:name` lexicographic order so the result is deterministic across users.
- Slot rectangle width and height use the fallback constants `CANVAS_NODE_FALLBACK_WIDTH=272` and `CANVAS_NODE_FALLBACK_HEIGHT=62`, not React Flow `measured` values, because first-render measurements are not yet available when placement runs.
- EntryPoints are excluded from the raster-scan; they anchor to their AP's left side at `x < 0` (ADR-0005) and never occupy a fallback grid slot.
- Placement is in-memory only — it does not write to Canvas Layout. Once the user drags a placed node, the existing debounced save path takes over and the position becomes saved on subsequent loads.
- When the rendered node set diff produces previously-unseen nodes, the canvas follows them: a single new node uses `setCenter` (preserving zoom); multiple simultaneous new nodes use `fitView` framed to the new subset. This applies uniformly regardless of trigger source — the product's main creation path is in-UI (where viewport-follow is expected); rare external triggers (kubectl/API) accept the same follow behavior rather than carrying a per-trigger flag through the detection pipeline.
- The first detect after opening the canvas is not a follow event — opening `fitView` (keyed on Project UID) already handles initial framing.
