# Place New Canvas Nodes as a Left-to-Right Flow

Newly discovered canvas nodes without saved layout are placed so detected connections read as `EntryPoint -> AP -> DB`. This gives first-time and newly changed project canvases a predictable resource flow while preserving user-saved Canvas Layout positions once they exist.

## Considered Options

- Use list order or centroids for related-node placement: rejected because positions can shift when unrelated resources or bindings are added or removed.
- Leave all new nodes in a generic grid: rejected because detected runtime dependencies are harder to scan.

## Consequences

EntryPoints are initially placed to the left of their AP, and DBs are initially placed to the right of a stable AP anchor. Edge anchors remain geometric and direction-agnostic; the left-to-right rule is only an initial placement convention.
