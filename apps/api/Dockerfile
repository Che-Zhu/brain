# Build stage
# Build context is monorepo root - use apps/api/ paths
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api/ .
RUN CGO_ENABLED=0 go build -o /api .

# Run stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /api .

EXPOSE 8080

CMD ["./api"]
