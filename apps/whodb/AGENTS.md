# WhoDB Backend Development Guide

WhoDB is now maintained here as a backend-only Go service module. The public API is GraphQL-first and built around `SourceType`, `SourceContract`, `SourceObject`, `SourceObjectRef`, and `SourceSessionMetadata`.

## Non-Negotiable Rules

1. Analyze before coding. Read relevant files and understand existing patterns before editing.
2. GraphQL-first. New API functionality must be GraphQL unless HTTP is required for transport, such as health checks, file downloads, or streaming.
3. No SQL injection. Do not use `fmt.Sprintf` with user input for SQL. Use parameterized queries or GORM builders.
4. Plugin architecture. Do not add shared `switch dbType` or `if dbType ==` logic. Database-specific logic belongs in plugins.
5. Exported Go functions and types need doc comments.
6. Do not add non-backend product surfaces, edition-specific code, model-provider code, automation agents, or synthetic data generators.
7. Keep changes surgical. Touch only files required by the task.
8. Verify before completing: `cd core && go test ./...` and `cd core && go build ./cmd/whodb`.
9. Remove build artifacts after verification.

## Project Structure

```text
core/
  cmd/whodb/main.go
  graph/schema.graphqls
  graph/*.resolvers.go
  src/app/
  src/router/
  src/source/
  src/sourcecatalog/
  src/dbcatalog/
  src/env/
  src/envconfig/
  src/plugins/
```

## Backend Scope

Keep:

- GraphQL API at `/api/query`
- health check at `/health`
- export endpoint at `/api/export`
- import/export and query suggestions
- AWS/Azure/GCP provider support
- all existing CE database plugins

Do not reintroduce:

- static asset hosting
- regular REST compatibility wrappers
- browser cookie auth
- model-provider or automation-agent code
- synthetic data generation
- non-backend product surfaces or release workflow code
