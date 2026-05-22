# Persist Canvas Node Stack Order in Canvas Layout

Canvas Node Stack Order is persisted as part of the Project-scoped Canvas Layout so a selected or meaningfully returned canvas node stays readable when node cards overlap. Each Canvas Layout node stores an optional `stackOrder` rank; the Next.js canvas layout API normalizes ranks before persistence, while the client may optimistically bring a selected node to the front immediately.

## Considered Options

- Rely only on React Flow's selected-node elevation: rejected because it is local interaction state and does not preserve the user's intended layering after reload.
- Use `layout.nodes` array order as the stack order: rejected because Canvas Layout saves merge by node reference, and array-order layering would turn a single node selection into a whole-document reorder.
- Persist unbounded `max + 1` ranks from the client: rejected because the stored numbers would grow forever and concurrent clients could normalize differently.
- Restore an orphaned node's previous stack order unconditionally: rejected because a resource that meaningfully returns should be easy for the user to notice, while short list or reconciliation gaps should not steal the top layer.

## Consequences

The editable Project canvas brings a node to the front on node click, node drag start, or URL-driven node selection, then debounces persistence through the existing Canvas Layout save path. Read-only canvases and share previews may bring a selected node to the front locally, but they do not persist stack-order changes. Canvas Connection selection, hover, and hover-driven expansion do not change Canvas Node Stack Order.

When a node has no saved stack order, the default layer follows the detected resource order: AP below DB below EntryPoint. The Next.js layout API is the normalization authority, compressing saved ranks to dense small integers and using last-write-wins semantics when multiple sessions select different topmost nodes. If an orphaned Canvas Layout item reappears after the 10-second stack-order return stability window, or reappears with the same kind/namespace/name but a different Kubernetes UID, its position and expansion state are restored while its stack order is treated as a fresh return and brought to the front.
