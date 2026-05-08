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

func TestWhoDBHTTPClientListsSourceObjectsWithBearerSourceCredentials(t *testing.T) {
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
		_, _ = w.Write([]byte(`{"data":{"SourceObjects":[{"Ref":{"Kind":"Database","Path":["postgres"]},"Kind":"Database","Name":"postgres","Path":["postgres"],"HasChildren":true,"Metadata":[]}]}}`))
	}))
	defer server.Close()

	client := NewWhoDBHTTPClient(server.URL, server.Client(), time.Second)
	objects, err := client.ListObjects(context.Background(), WhoDBSourceCredentials{
		SourceType: "Postgres",
		Values: map[string]string{
			"Hostname": "pg-main-postgresql.ns-a.svc",
			"Port":     "5432",
			"Username": "alice",
			"Password": "s3cr3t",
			"Database": "postgres",
		},
	}, nil, nil)
	if err != nil {
		t.Fatalf("expected object listing to succeed: %v", err)
	}
	if len(objects) != 1 || objects[0].Kind != "Database" || objects[0].Name != "postgres" || !objects[0].HasChildren {
		t.Fatalf("unexpected objects: %+v", objects)
	}
	if gotBody.OperationName != "AccessObjects" || !strings.Contains(gotBody.Query, "SourceObjects") {
		t.Fatalf("unexpected GraphQL request body: %+v", gotBody)
	}
	if len(gotBody.Variables) != 0 {
		t.Fatalf("expected no root variables, got %+v", gotBody.Variables)
	}
	if gotAuth == "" || !strings.HasPrefix(gotAuth, "Bearer ") {
		t.Fatalf("expected bearer credentials, got %q", gotAuth)
	}
}

func TestWhoDBHTTPClientListsSourceObjectsWithParentAndKindVariables(t *testing.T) {
	var gotBody struct {
		OperationName string         `json:"operationName"`
		Query         string         `json:"query"`
		Variables     map[string]any `json:"variables"`
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/query" {
			t.Fatalf("unexpected WhoDB request target: %s %s", r.Method, r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("failed to decode WhoDB request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"SourceObjects":[{"Ref":{"Kind":"Table","Path":["postgres","public","users"]},"Kind":"Table","Name":"users","Path":["postgres","public","users"],"HasChildren":false,"Metadata":[{"Key":"Type","Value":"BASE TABLE"}]}]}}`))
	}))
	defer server.Close()

	client := NewWhoDBHTTPClient(server.URL, server.Client(), time.Second)
	objects, err := client.ListObjects(
		context.Background(),
		WhoDBSourceCredentials{SourceType: "Postgres"},
		&WhoDBObjectRef{Kind: "Schema", Path: []string{"postgres", "public"}},
		[]string{"Table"},
	)
	if err != nil {
		t.Fatalf("expected child object listing to succeed: %v", err)
	}
	if len(objects) != 1 || objects[0].Kind != "Table" || objects[0].Name != "users" || objects[0].Metadata["Type"] != "BASE TABLE" {
		t.Fatalf("unexpected objects: %+v", objects)
	}
	if gotBody.OperationName != "AccessObjects" || !strings.Contains(gotBody.Query, "SourceObjects") {
		t.Fatalf("unexpected GraphQL request body: %+v", gotBody)
	}
	parent, ok := gotBody.Variables["parent"].(map[string]any)
	if !ok || parent["Kind"] != "Schema" {
		t.Fatalf("expected schema parent variable, got %+v", gotBody.Variables)
	}
	kinds, ok := gotBody.Variables["kinds"].([]any)
	if !ok || len(kinds) != 1 || kinds[0] != "Table" {
		t.Fatalf("expected table kind variable, got %+v", gotBody.Variables)
	}
}
