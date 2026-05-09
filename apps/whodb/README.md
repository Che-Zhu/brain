# WhoDB Backend Service

This repository contains the backend service module for WhoDB.

The Go module lives in `core/` and exposes the GraphQL-first database management API from `core/cmd/whodb`.

## Build

```bash
cd core
go build ./cmd/whodb
```

## Test

```bash
cd core
go test ./...
```

## Runtime

The service listens on `PORT`, defaulting to `11000`.

Public endpoints:

- `GET /health`
- `POST /api/query`
- `POST /api/export`

All database API requests use source credentials in the `Authorization: Bearer <base64-json>` header.
