# Anchor Unplaced Entry Nodes to Their AP's Left Side

When an EntryPoint has no saved Canvas Layout entry, place it at `{ x: AP.position.x - 340, y: AP.position.y }` — one fallback grid column to the left of its AP — regardless of whether the AP itself is saved or fallback-placed.

## Considered Options

- **Treat EntryPoint like any other unplaced node (raster-scan placement, ADR-0004).** Rejected because EntryPoints are 1:1 bound to APs at the resource level, and visual coupling should mirror that — placing the EntryPoint in the next free fallback slot creates Canvas Connections that traverse the canvas.
- **Anchor to the AP's right side (`+340`).** Rejected because the fallback grid for AP/DB extends rightward from origin, so right-side EntryPoints would collide with the next AP/DB slot. Left-side placement (`-340`) is cleanly disjoint at `x < 0` and never participates in the raster-scan occupancy check.
- **Anchor to the AP's top or bottom side.** Rejected because the canvas has no fixed flow semantics (`selectCanvasAnchorPair` chooses connection sides dynamically by geometry), so "entry is on top because traffic flows down" is a layout preference, not a documented direction. Left-side anchoring also reads naturally left-to-right as `[EntryPoint][AP]`.
- **Encode placement in the K8s resource spec (e.g., `spec.suggestedPosition`).** Rejected because Canvas Layout lives in App Postgres while K8s/Crossplane is the resource source of truth (ADR-0001).
- **Dynamic — find the nearest free side of the AP.** Rejected because the result depends on the current state of the canvas, breaking determinism across users and complicating tests; the 1:1 AP/EntryPoint relationship means a fixed offset is always available.

## Consequences

- EntryPoints land in negative `x` coordinates when their AP is at `x=0` (the fallback grid origin). React Flow supports negative coordinates and `fitView` includes them; engineers should not "fix" the negative offset.
- The rule applies in every "no saved layout" case: first appearance, return after orphan cleanup (ADR-0001), or any future scenario where the saved entry is absent.
- Once the user moves the EntryPoint, the saved position takes precedence on subsequent loads.
- Multiple EntryPoints anchored to different APs never collide because each follows its own AP's `y`-coordinate.
