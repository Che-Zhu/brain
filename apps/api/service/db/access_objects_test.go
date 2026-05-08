package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestAccessObjectsListsRootObjectsThroughGuardedDBAccess(t *testing.T) {
	store := readyAccessObjectsStore()
	whodb := &recordingWhoDBObjectClient{
		objects: []WhoDBObject{
			{
				Ref:         WhoDBObjectRef{Kind: "Database", Path: []string{"postgres"}},
				Kind:        "Database",
				Name:        "postgres",
				Path:        []string{"postgres"},
				HasChildren: true,
			},
		},
	}
	svc := AccessObjectsService{Store: store, WhoDB: whodb}

	result, err := svc.List(context.Background(), AccessObjectsRequest{
		Name:       "pg-main",
		Namespace:  "ns-a",
		ProjectUID: "project-1",
	})
	if err != nil {
		t.Fatalf("expected object browsing to succeed: %v", err)
	}

	if len(result.Objects) != 1 {
		t.Fatalf("expected one root object, got %+v", result.Objects)
	}
	first := result.Objects[0]
	if first.Kind != "database" || first.Name != "postgres" || first.Ref.Kind != "database" || strings.Join(first.Ref.Path, "/") != "postgres" || !first.HasChildren {
		t.Fatalf("unexpected first root object: %+v", first)
	}

	if whodb.credentials.SourceType != "Postgres" || whodb.credentials.Values["Password"] != "s3cr3t" {
		t.Fatalf("expected generated WhoDB credentials, got %+v", whodb.credentials)
	}
	if whodb.parent != nil {
		t.Fatalf("expected root browsing without parent, got %+v", whodb.parent)
	}

	body, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("failed to marshal result: %v", err)
	}
	for _, forbidden := range []string{"s3cr3t", "alice", "pg-main-postgresql"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("objects response exposed credential material %q: %s", forbidden, string(body))
		}
	}
}

func TestAccessObjectsListsChildrenUnderReturnedRef(t *testing.T) {
	store := readyAccessObjectsStore()
	whodb := &recordingWhoDBObjectClient{
		objects: []WhoDBObject{
			{
				Ref:         WhoDBObjectRef{Kind: "Schema", Path: []string{"postgres", "public"}},
				Kind:        "Schema",
				Name:        "public",
				Path:        []string{"postgres", "public"},
				HasChildren: true,
			},
		},
	}
	svc := AccessObjectsService{Store: store, WhoDB: whodb}

	result, err := svc.List(context.Background(), AccessObjectsRequest{
		Name:       "pg-main",
		Namespace:  "ns-a",
		ProjectUID: "project-1",
		Parent:     &AccessObjectRef{Kind: "database", Path: []string{"postgres"}},
	})
	if err != nil {
		t.Fatalf("expected child object browsing to succeed: %v", err)
	}

	if whodb.parent == nil || whodb.parent.Kind != "Database" || strings.Join(whodb.parent.Path, "/") != "postgres" {
		t.Fatalf("expected WhoDB lookup under database ref, got %+v", whodb.parent)
	}
	if len(result.Objects) != 1 {
		t.Fatalf("expected one schema object, got %+v", result.Objects)
	}
	first := result.Objects[0]
	if first.Kind != "schema" || first.Name != "public" || first.Ref.Kind != "schema" || strings.Join(first.Ref.Path, "/") != "postgres/public" || !first.HasChildren {
		t.Fatalf("unexpected child object: %+v", first)
	}
}

func TestAccessObjectsNarrowsResultsByKind(t *testing.T) {
	store := readyAccessObjectsStore()
	whodb := &recordingWhoDBObjectClient{
		objects: []WhoDBObject{
			{
				Ref:  WhoDBObjectRef{Kind: "Table", Path: []string{"postgres", "public", "users"}},
				Kind: "Table",
				Name: "users",
				Path: []string{"postgres", "public", "users"},
				Metadata: map[string]string{
					"Type": "BASE TABLE",
				},
			},
		},
	}
	svc := AccessObjectsService{Store: store, WhoDB: whodb}

	result, err := svc.List(context.Background(), AccessObjectsRequest{
		Name:       "pg-main",
		Namespace:  "ns-a",
		ProjectUID: "project-1",
		Parent:     &AccessObjectRef{Kind: "schema", Path: []string{"postgres", "public"}},
		Kinds:      []string{"table"},
	})
	if err != nil {
		t.Fatalf("expected kind filtering to succeed: %v", err)
	}
	if got := strings.Join(whodb.kinds, ","); got != "Table" {
		t.Fatalf("expected WhoDB table kind filter, got %q", got)
	}
	if len(result.Objects) != 1 || result.Objects[0].Kind != "table" || result.Objects[0].Metadata["Type"] != "BASE TABLE" {
		t.Fatalf("unexpected filtered objects: %+v", result.Objects)
	}
}

func TestAccessObjectsRejectsInvalidRefsAndUnsupportedKinds(t *testing.T) {
	store := readyAccessObjectsStore()
	tests := []struct {
		name    string
		request AccessObjectsRequest
		wantErr error
	}{
		{
			name: "invalid schema ref path",
			request: AccessObjectsRequest{
				Name:       "pg-main",
				Namespace:  "ns-a",
				ProjectUID: "project-1",
				Parent:     &AccessObjectRef{Kind: "schema"},
			},
			wantErr: ErrAccessObjectsInvalidRef,
		},
		{
			name: "blank path segment",
			request: AccessObjectsRequest{
				Name:       "pg-main",
				Namespace:  "ns-a",
				ProjectUID: "project-1",
				Parent:     &AccessObjectRef{Kind: "schema", Path: []string{"postgres", ""}},
			},
			wantErr: ErrAccessObjectsInvalidRef,
		},
		{
			name: "unsupported requested kind",
			request: AccessObjectsRequest{
				Name:       "pg-main",
				Namespace:  "ns-a",
				ProjectUID: "project-1",
				Kinds:      []string{"row"},
			},
			wantErr: ErrAccessObjectsUnsupportedKind,
		},
		{
			name: "unsupported parent kind",
			request: AccessObjectsRequest{
				Name:       "pg-main",
				Namespace:  "ns-a",
				ProjectUID: "project-1",
				Parent:     &AccessObjectRef{Kind: "row", Path: []string{"postgres", "public", "users", "1"}},
			},
			wantErr: ErrAccessObjectsUnsupportedKind,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := AccessObjectsService{Store: store, WhoDB: &recordingWhoDBObjectClient{}}
			_, err := svc.List(context.Background(), tt.request)
			if err == nil || !errors.Is(err, tt.wantErr) {
				t.Fatalf("expected %v, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestAccessObjectsCapsLargeWhoDBListings(t *testing.T) {
	store := readyAccessObjectsStore()
	objects := make([]WhoDBObject, 0, maxAccessObjects+2)
	for i := range maxAccessObjects + 2 {
		name := fmt.Sprintf("table-%03d", i)
		objects = append(objects, WhoDBObject{
			Ref:  WhoDBObjectRef{Kind: "Table", Path: []string{"postgres", "public", name}},
			Kind: "Table",
			Name: name,
			Path: []string{"postgres", "public", name},
		})
	}
	svc := AccessObjectsService{
		Store: store,
		WhoDB: &recordingWhoDBObjectClient{
			objects: objects,
		},
	}

	result, err := svc.List(context.Background(), AccessObjectsRequest{
		Name:       "pg-main",
		Namespace:  "ns-a",
		ProjectUID: "project-1",
	})
	if err != nil {
		t.Fatalf("expected capped object browsing to succeed: %v", err)
	}
	if len(result.Objects) != maxAccessObjects {
		t.Fatalf("expected %d objects, got %d", maxAccessObjects, len(result.Objects))
	}
	if !result.Truncated {
		t.Fatalf("expected truncated result")
	}
}

func readyAccessObjectsStore() *fakeAccessHealthStore {
	return &fakeAccessHealthStore{
		db: readyAccessHealthDB("pg-main", "ns-a", "postgresql", "project-1"),
		secret: &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: "pg-main-conn-credential", Namespace: "ns-a"},
			Data: map[string][]byte{
				"host":     []byte("pg-main-postgresql"),
				"port":     []byte("5432"),
				"username": []byte("alice"),
				"password": []byte("s3cr3t"),
			},
		},
	}
}

type recordingWhoDBObjectClient struct {
	credentials WhoDBSourceCredentials
	parent      *WhoDBObjectRef
	kinds       []string
	objects     []WhoDBObject
	err         error
}

func (r *recordingWhoDBObjectClient) ListObjects(_ context.Context, credentials WhoDBSourceCredentials, parent *WhoDBObjectRef, kinds []string) ([]WhoDBObject, error) {
	r.credentials = credentials
	r.parent = parent
	r.kinds = kinds
	if r.err != nil {
		return nil, r.err
	}
	return r.objects, nil
}
