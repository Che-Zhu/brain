package db

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestWhoDBHTTPClientChecksHealthWithBearerSourceCredentials(t *testing.T) {
	var gotAuth string
	var gotBody struct {
		OperationName string         `json:"operationName"`
		Query         string         `json:"query"`
		Variables     map[string]any `json:"variables"`
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/query" {
			t.Fatalf("unexpected WhoDB request target: %s %s", r.Method, r.URL.Path)
		}
		gotAuth = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("failed to decode WhoDB request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"Health":{"Server":"healthy","Database":"healthy"}}}`))
	}))
	defer server.Close()

	client := NewWhoDBHTTPClient(server.URL, server.Client(), time.Second)
	health, err := client.CheckHealth(context.Background(), WhoDBSourceCredentials{
		SourceType: "Postgres",
		Values: map[string]string{
			"Hostname": "pg-main-postgresql.ns-a.svc",
			"Port":     "5432",
			"Username": "alice",
			"Password": "s3cr3t",
			"Database": "postgres",
		},
	})
	if err != nil {
		t.Fatalf("expected WhoDB health check to succeed: %v", err)
	}
	if health.Server != "healthy" || health.Database != "healthy" {
		t.Fatalf("unexpected health: %+v", health)
	}
	if gotBody.OperationName != "AccessHealth" || !strings.Contains(gotBody.Query, "Health") {
		t.Fatalf("unexpected GraphQL request body: %+v", gotBody)
	}
	if gotAuth == "" || !strings.HasPrefix(gotAuth, "Bearer ") {
		t.Fatalf("expected bearer credentials, got %q", gotAuth)
	}
	rawToken := strings.TrimPrefix(gotAuth, "Bearer ")
	rawCredentials, err := base64.StdEncoding.DecodeString(rawToken)
	if err != nil {
		t.Fatalf("expected base64 bearer credentials: %v", err)
	}
	var gotCredentials WhoDBSourceCredentials
	if err := json.Unmarshal(rawCredentials, &gotCredentials); err != nil {
		t.Fatalf("expected source credentials JSON: %v", err)
	}
	if gotCredentials.SourceType != "Postgres" || gotCredentials.Values["Password"] != "s3cr3t" {
		t.Fatalf("unexpected bearer credentials: %+v", gotCredentials)
	}
}
