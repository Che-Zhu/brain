# AGENTS.md

Guidance for AI coding agents working in this repo. Keep it short.

## Project

- **Name:** `sealai` — monorepo for an internal platform combining a Next.js UI, a shadcn-style component registry, and a Go backend API.
- **Shape:** Turbo monorepo with `apps/*` (ui, registry, api) and `packages/*` (ui, crossplane, eslint-config, typescript-config).
- **Package manager:** **bun 1.3.5** (NOT npm/pnpm/yarn). Node ≥20. Lockfile: `bun.lock`.

## Workspace layout

```
apps/
  ui/         Next.js 16.2.3, React 19.2 — main product UI (default port 3000)
  registry/   Next.js 16.2.2 — component preview registry (port 10000)
  api/        Go service (Huma + chi) — K8s/db/task/logs/metrics endpoints
packages/
  ui/         @workspace/ui — shared shadcn/ui + Radix + Tailwind 4 components
  crossplane/ @workspace/crossplane — K8s status schemas & utilities
  eslint-config/     shared eslint configs (base, next-js, react-internal)
  typescript-config/ shared tsconfig bases
```

## Standard commands (run from repo root unless noted)

- `bun dev` — Turbo runs every app's dev server in parallel
- `bun build` — build all workspaces
- `bun lint` — turbo lint (per-package eslint)
- `bun format` — turbo format (prettier)
- `bun typecheck` — turbo typecheck (tsc --noEmit)
- `bun check` / `bun fix` — ultracite/biome code checks & autofix
- Registry build: `cd apps/registry && bun run registry:build` (runs `shadcn build`)
- Go API: `cd apps/api && <air|go run|go build|go test>` (see app's package.json scripts)

## Conventions

- **Imports:** use path aliases `@workspace/ui/components/<name>`, `@workspace/crossplane/*`, and `@/*` (app-local). Never reach into another app via relative paths.
- **UI components:** Before writing a new component, grep `packages/ui/src/components/` first — shadcn / Radix primitives (Button, Dialog, Tooltip, Form, etc.) are already there, do not rebuild them in `apps/*` or `features/*`. Reusable primitives belong in `packages/ui/src/components/`; app-specific compositions stay in the app or feature. Promote an app-local component to `packages/ui/` only when a *second* consumer needs it.
- **Styling:** Tailwind CSS v4 via PostCSS. Global theme in `packages/ui/src/styles/globals.css` (OKLCH tokens, light/dark via `next-themes` class strategy).
- **Design tokens:** Don't inline hex/rgb/hsl or bare px/rem values. Use, in preference order: (1) semantic theme tokens from `packages/ui/src/styles/globals.css` (`var(--color-background)`, `var(--color-border)`, `var(--color-primary)`, `var(--radius)`, …) for anything that should follow the app theme; (2) Tailwind palette / scale via CSS vars or utility classes (`var(--color-zinc-600)` / `bg-zinc-600`, `p-4`, `rounded-md`) for values intentionally not theme-coupled; (3) if neither fits, add a new semantic token in `globals.css` before inlining a literal. Rule covers colors, spacing, radii, typography, shadows. Escape hatch: third-party SDK mandates or temporary debugging — leave a comment.
- **Linting:** Biome (via `ultracite`) is the source of truth for formatting/lint. Config: `biome.jsonc` extends `ultracite/biome/core`.
- **Registry items:** defined under `apps/registry/registry/<style>/<group>/<name>` with metadata in `preview-registry.ts`.

## When making changes

- Default to editing existing files; don't introduce parallel patterns.
- Before claiming work is done, run `bun typecheck` and `bun check` and confirm they pass.
- `output: "standalone"` is set on Next.js apps — be mindful when touching build config (Docker depends on it).
