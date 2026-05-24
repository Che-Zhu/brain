# AP Settings Resource Cards Design

## Context

The AP Settings panel currently groups CPU, Memory, and Replica Strategy under a generic Resource quota presentation. The target Figma node separates these into two dark section cards: Replica Strategy and CPU / Memory.

## Goal

Update the visual structure of the AP Settings resource controls to match the Figma direction while preserving the existing data model, draft state, validation, save flow, read-only behavior, and patch payloads.

## Scope

- Restyle the shared `ContainerSettingsPane` resource area.
- Replace the visible Resource quota heading with two section cards: Replica Strategy and CPU / Memory.
- Keep Fixed Replicas and Elastic Scaling as the existing AP Replica Strategy modes.
- Keep CPU and Memory controls as per-replica capacity controls, distinct from Elastic Scaling targets.
- Update tests that assert static markup for these controls.

## Out of Scope

- No changes to AP desired-state schema.
- No changes to replica strategy normalization or Kubernetes patch generation.
- No changes to autoscaler behavior.
- No broad redesign of Image, Environment, Network, Custom Storage, or Configuration Files sections.

## Design

`ContainerSettingsPane` will gain small presentational helpers for Figma-aligned section cards and slider cards. These helpers stay local to the component unless another consumer needs them later.

Replica Strategy renders as one bordered rounded section card with a 44px header, a Settings2 icon, and content padding matching the Figma layout. The existing Fixed Replicas / Elastic Scaling segmented control remains at the top of the content area. Fixed mode renders one inset slider card labeled `Number of Replicas`, with a formatted value such as `7 Replicas`. Elastic mode stays in the same section card and renders minimum replicas, maximum replicas, scaling target, and the active target slider using the same inset card language.

CPU / Memory renders as a separate bordered rounded section card. Its content contains two inset slider cards: CPU and Memory. CPU displays formatted values such as `2 Cores`; Memory displays human-readable binary units such as `512 Mi`, `4 Gi`, or `32 Gi`. ARIA labels and saved numeric values continue to use the current precise meanings: CPU quota in cores and Memory quota in MiB.

Read-only rendering keeps its non-mutating summary behavior, adjusted only where necessary to remain visually consistent with the new section card structure.

## Testing

- Update `packages/ui/src/components/container-settings-pane/container-settings-pane.test.tsx` static markup assertions for the new labels and formatted values.
- Run `bun typecheck`.
- Run `bun check`.

## Acceptance Criteria

- AP Settings shows `Replica Strategy` and `CPU / Memory` as separate section cards.
- Fixed Replicas mode shows `Number of Replicas` and a pluralized value.
- Elastic Scaling mode remains available and visually aligned with the same section-card system.
- CPU and Memory labels display clean product text while values include units.
- Existing save, cancel, dirty-state, read-only, and patch behavior remains unchanged.
