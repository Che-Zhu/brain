---
name: composition-naming-convention
description: How to split large React feature areas into files, name them, and expose a compound API. Use when refactoring component folders, designing context slices, or extending @workspace/ui feature modules.
---

# Composition and naming conventions

General guidelines for **where to cut files**, **how to name them**, and **how to compose** a clear public API. Aligned with [Vercel composition patterns](https://github.com/vercel/composition-patterns)—compound components, context for shared state, avoid boolean-prop sprawl—not tied to any single domain (chat is one reference implementation under `packages/ui/src/components/chat`).

## When to split

- **One file, two roles** (e.g. list + row item + dispatcher)—split along **render role** or **data flow**.
- **Repeated branches** (if/else for many sub-types)—extract **variants** or **per-type renderers** into their own modules.
- **Shared state** needed by distant siblings—**one provider** + **slice hooks** instead of prop chains.
- **Public API surface** should stay small—use a **single compound entry** (`Feature`) with named subcomponents.

## File naming

| Pattern | Role |
|--------|------|
| `<feature>.context.tsx` | Provider, root props, `createContext`, and **slice hooks** (`useFeature`, `useFeatureHeader`, …). |
| `<feature>.<area>.tsx` | One **vertical slice** of UI (header, list, form, sidebar)—one primary concern per file. |
| `<feature>.<helper>.tsx` | **Cross-cutting** pieces used by a slice (row renderer, tool row, item part). |
| `<feature>.types.ts` | Props and **context value** types shared by the folder. |
| `<feature>.tsx` | **Thin barrel**: re-exports types/hooks/context and **`Object.assign(FeatureShell, { … })`** compound API—minimal logic. |

Use a **consistent prefix** (`<feature>.`) so files sort together. Prefer **`lowercase` + dot** (`feature.area.tsx`) in this repo for feature folders; keep **exported** component names **PascalCase** (`FeatureHeader`).

## Public API naming

- **Shell**: Outer layout primitive (often a styled `div`); assign **`displayName = "Feature"`** if the ergonomic name differs from the identifier.
- **Root**: Implement as `FeatureRoot` in context file; expose as **`Feature.Root`** when using the compound object pattern.
- **Compound assignment**:  
  `export const Feature = Object.assign(FeatureShell, { Root, Header, Body, …, useFeature })`  
  so call sites stay **`Feature.Header`** / **`Feature.Root`** stable.
- **Hooks**: **`useFeature`** returns the full context value; **`useFeature<Xxx>`** returns one **slice** (header, panel, …). Prefer narrow hooks so leaves re-render predictably.

## Context and types

- **Root props**: Group by **domain slices** (`header`, `navigation`, `content`), not unrelated booleans. Optional behavior belongs under **`states`** / **`actions`** objects on those slices where it keeps the root tidy.
- **Context value**: Often mirrors slices: `{ header: HeaderValue; main: MainValue; … }` with **`HeaderValue`** = `{ states, actions }` (or equivalent) typed in **`<feature>.types.ts`**.
- **Naming**: **`XxxStates`**, **`XxxActions`**, **`XxxValue`** (single slice)—keeps tooling and refactor search consistent.

This matches **state-context-interface**: the provider owns implementation; consuming components depend on typed slices.

## Composition rules

1. **One provider per feature area** that needs shared state; derive context with **`useMemo`** when the value object is stable but built from props.
2. **Composition over toggles**: prefer composing small components (`Shell` + `Field` + `Submit`) instead of `<Area showFooter hidePreview />`.
3. **Name by role**, not version: `ComposerSend` over `Variant2Button` unless version is part of the product API.
4. **`data-slot`**: Use a **feature prefix** (`data-slot="feature-header"`) for tests and theme hooks.
5. **Barrel file** (`feature.tsx`): acceptable as the **only** facade that wires the compound object; keep it logic-light. If the repo uses a lint rule against barrels, allow it here with an explicit ignore + comment.

## Map to Vercel composition-pattern ideas

| Idea | Practice |
|------|----------|
| Compound components | `Feature.*` from `Object.assign` |
| Lift state | `FeatureRoot` / provider owns wiring |
| Context interface | Typed `XxxValue` per slice |
| Explicit pieces | Separate files per area/helper |
| Avoid boolean explosion | Nested `states` / `actions` on slices |

## Imports (`packages/ui`)

Primitives: **`@workspace/ui/components/…`**. Inside a feature folder, **relative** imports (`./feature.context`, `./feature.types`) keep the boundary clear.

## Checklist when adding a new slice

1. Extend **`<feature>.types.ts`** (`SliceValue`, `SliceStates`, `SliceActions`).
2. **Plumb** through `FeatureRoot` and context value if the slice needs provider data.
3. Add **`useFeatureSlice`** if a subtree reads only that slice.
4. **Attach** to `Feature` in the barrel **only** if it is part of the supported public surface.
