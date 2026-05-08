package db

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"
)

var (
	ErrAccessObjectsInvalidRef      = errors.New("invalid db object ref")
	ErrAccessObjectsUnsupportedKind = errors.New("unsupported db object kind")
)

const (
	AccessObjectKindCollection = "collection"
	AccessObjectKindDatabase   = "database"
	AccessObjectKindFunction   = "function"
	AccessObjectKindIndex      = "index"
	AccessObjectKindItem       = "item"
	AccessObjectKindKey        = "key"
	AccessObjectKindProcedure  = "procedure"
	AccessObjectKindSchema     = "schema"
	AccessObjectKindSequence   = "sequence"
	AccessObjectKindTable      = "table"
	AccessObjectKindTrigger    = "trigger"
	AccessObjectKindView       = "view"
	maxAccessObjects           = 500
)

type AccessObjectsRequest struct {
	Name       string
	Namespace  string
	ProjectUID string
	Parent     *AccessObjectRef
	Kinds      []string
}

type AccessObjectRef struct {
	Kind string   `json:"kind"`
	Path []string `json:"path"`
}

type AccessObject struct {
	Ref         AccessObjectRef   `json:"ref"`
	Kind        string            `json:"kind"`
	Name        string            `json:"name"`
	DisplayName string            `json:"displayName,omitempty"`
	HasChildren bool              `json:"hasChildren"`
	ChildKinds  []string          `json:"childKinds,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

type AccessObjectsResult struct {
	Objects   []AccessObject `json:"objects"`
	Truncated bool           `json:"truncated"`
}

type WhoDBObjectRef struct {
	Kind string
	Path []string
}

type WhoDBObject struct {
	Ref         WhoDBObjectRef
	Kind        string
	Name        string
	Path        []string
	HasChildren bool
	Metadata    map[string]string
}

type WhoDBObjectClient interface {
	ListObjects(ctx context.Context, credentials WhoDBSourceCredentials, parent *WhoDBObjectRef, kinds []string) ([]WhoDBObject, error)
}

type AccessObjectsService struct {
	Store AccessHealthStore
	WhoDB WhoDBObjectClient
	Audit AccessHealthAuditLogger
}

func (s AccessObjectsService) List(ctx context.Context, req AccessObjectsRequest) (result *AccessObjectsResult, err error) {
	req.Name = strings.TrimSpace(req.Name)
	req.Namespace = strings.TrimSpace(req.Namespace)
	req.ProjectUID = strings.TrimSpace(req.ProjectUID)
	start := time.Now()
	audit := AccessHealthAuditEvent{
		Operation:  "db.access.objects",
		ProjectUID: req.ProjectUID,
		DBName:     req.Name,
		Namespace:  req.Namespace,
		Outcome:    "error",
	}
	defer func() {
		if result != nil {
			audit.Outcome = "ok"
		}
		audit.Duration = time.Since(start)
		s.auditLogger().LogAccessHealth(audit)
	}()

	if req.ProjectUID == "" {
		return nil, ErrAccessHealthProjectUID
	}
	kindFilter, err := newAccessObjectKindFilter(req.Kinds)
	if err != nil {
		return nil, err
	}

	engine, credentials, err := guardDBAccess(ctx, s.Store, guardedAccessRequest{
		Name:       req.Name,
		Namespace:  req.Namespace,
		ProjectUID: req.ProjectUID,
	})
	if err != nil {
		return nil, err
	}
	audit.Engine = engine

	parent, err := accessObjectParentForWhoDB(req.Parent)
	if err != nil {
		return nil, err
	}
	kinds := kindFilter.whoDBKinds()
	objects, err := s.WhoDB.ListObjects(ctx, credentials, parent, kinds)
	if err != nil {
		return nil, err
	}
	resultObjects, err := accessObjectsFromWhoDB(objects, kindFilter)
	if err != nil {
		return nil, err
	}
	resultObjects, truncated := capAccessObjects(resultObjects)
	return &AccessObjectsResult{Objects: resultObjects, Truncated: truncated}, nil
}

func accessObjectParentForWhoDB(parent *AccessObjectRef) (*WhoDBObjectRef, error) {
	if parent == nil {
		return nil, nil
	}
	kind, err := canonicalAccessObjectKind(parent.Kind)
	if err != nil {
		return nil, err
	}
	path := cleanAccessObjectPath(parent.Path)
	if len(path) == 0 {
		return nil, ErrAccessObjectsInvalidRef
	}
	return &WhoDBObjectRef{Kind: whoDBKindForAccessObjectKind(kind), Path: path}, nil
}

func accessObjectsFromWhoDB(objects []WhoDBObject, kindFilter accessObjectKindFilter) ([]AccessObject, error) {
	mapped := make([]AccessObject, 0, len(objects))
	for _, object := range objects {
		kind, err := accessObjectKindFromWhoDB(object.Kind)
		if err != nil {
			return nil, err
		}
		if !kindFilter.allows(kind) {
			continue
		}
		path := object.Ref.Path
		if len(path) == 0 {
			path = object.Path
		}
		path = cleanAccessObjectPath(path)
		if len(path) == 0 {
			continue
		}
		name := strings.TrimSpace(object.Name)
		if name == "" {
			name = path[len(path)-1]
		}
		mapped = append(mapped, AccessObject{
			Ref:         AccessObjectRef{Kind: kind, Path: path},
			Kind:        kind,
			Name:        name,
			DisplayName: name,
			HasChildren: object.HasChildren,
			Metadata:    object.Metadata,
		})
	}
	return mapped, nil
}

func capAccessObjects(objects []AccessObject) ([]AccessObject, bool) {
	if len(objects) <= maxAccessObjects {
		return objects, false
	}
	return objects[:maxAccessObjects], true
}

type accessObjectKindFilter map[string]struct{}

func newAccessObjectKindFilter(kinds []string) (accessObjectKindFilter, error) {
	if len(kinds) == 0 {
		return nil, nil
	}
	filter := make(accessObjectKindFilter, len(kinds))
	for _, kind := range kinds {
		canonical, err := canonicalAccessObjectKind(kind)
		if err != nil {
			return nil, err
		}
		filter[canonical] = struct{}{}
	}
	return filter, nil
}

func (f accessObjectKindFilter) allows(kind string) bool {
	if len(f) == 0 {
		return true
	}
	_, ok := f[kind]
	return ok
}

func (f accessObjectKindFilter) whoDBKinds() []string {
	if len(f) == 0 {
		return nil
	}
	kinds := make([]string, 0, len(f))
	for kind := range f {
		kinds = append(kinds, whoDBKindForAccessObjectKind(kind))
	}
	return kinds
}

func canonicalAccessObjectKind(kind string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case AccessObjectKindCollection:
		return AccessObjectKindCollection, nil
	case AccessObjectKindDatabase:
		return AccessObjectKindDatabase, nil
	case AccessObjectKindFunction:
		return AccessObjectKindFunction, nil
	case AccessObjectKindIndex:
		return AccessObjectKindIndex, nil
	case AccessObjectKindItem:
		return AccessObjectKindItem, nil
	case AccessObjectKindKey:
		return AccessObjectKindKey, nil
	case AccessObjectKindProcedure:
		return AccessObjectKindProcedure, nil
	case AccessObjectKindSchema:
		return AccessObjectKindSchema, nil
	case AccessObjectKindSequence:
		return AccessObjectKindSequence, nil
	case AccessObjectKindTable:
		return AccessObjectKindTable, nil
	case AccessObjectKindTrigger:
		return AccessObjectKindTrigger, nil
	case AccessObjectKindView:
		return AccessObjectKindView, nil
	default:
		return "", ErrAccessObjectsUnsupportedKind
	}
}

func whoDBKindForAccessObjectKind(kind string) string {
	switch kind {
	case AccessObjectKindCollection:
		return "Collection"
	case AccessObjectKindDatabase:
		return "Database"
	case AccessObjectKindFunction:
		return "Function"
	case AccessObjectKindIndex:
		return "Index"
	case AccessObjectKindItem:
		return "Item"
	case AccessObjectKindKey:
		return "Key"
	case AccessObjectKindProcedure:
		return "Procedure"
	case AccessObjectKindSchema:
		return "Schema"
	case AccessObjectKindSequence:
		return "Sequence"
	case AccessObjectKindTable:
		return "Table"
	case AccessObjectKindTrigger:
		return "Trigger"
	case AccessObjectKindView:
		return "View"
	default:
		return ""
	}
}

func accessObjectKindFromWhoDB(kind string) (string, error) {
	switch strings.TrimSpace(kind) {
	case "Collection":
		return AccessObjectKindCollection, nil
	case "Database":
		return AccessObjectKindDatabase, nil
	case "Function":
		return AccessObjectKindFunction, nil
	case "Index":
		return AccessObjectKindIndex, nil
	case "Item":
		return AccessObjectKindItem, nil
	case "Key":
		return AccessObjectKindKey, nil
	case "Procedure":
		return AccessObjectKindProcedure, nil
	case "Schema":
		return AccessObjectKindSchema, nil
	case "Sequence":
		return AccessObjectKindSequence, nil
	case "Table":
		return AccessObjectKindTable, nil
	case "Trigger":
		return AccessObjectKindTrigger, nil
	case "View":
		return AccessObjectKindView, nil
	default:
		return "", ErrAccessObjectsUnsupportedKind
	}
}

func cleanAccessObjectPath(path []string) []string {
	cleaned := make([]string, 0, len(path))
	for _, part := range path {
		part = strings.TrimSpace(part)
		if part == "" {
			return nil
		}
		cleaned = append(cleaned, part)
	}
	return cleaned
}

func (s AccessObjectsService) auditLogger() AccessHealthAuditLogger {
	if s.Audit != nil {
		return s.Audit
	}
	return standardAccessObjectsAuditLogger{}
}

type standardAccessObjectsAuditLogger struct{}

func (standardAccessObjectsAuditLogger) LogAccessHealth(event AccessHealthAuditEvent) {
	log.Printf(
		"db access objects: operation=%s project=%s db=%s namespace=%s engine=%s duration=%s outcome=%s",
		event.Operation,
		event.ProjectUID,
		event.DBName,
		event.Namespace,
		event.Engine,
		event.Duration,
		event.Outcome,
	)
}
