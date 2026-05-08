package db

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type WhoDBHTTPClient struct {
	baseURL string
	client  *http.Client
	timeout time.Duration
}

func NewWhoDBHTTPClient(baseURL string, client *http.Client, timeout time.Duration) *WhoDBHTTPClient {
	if client == nil {
		client = http.DefaultClient
	}
	return &WhoDBHTTPClient{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		client:  client,
		timeout: timeout,
	}
}

func (c *WhoDBHTTPClient) CheckHealth(ctx context.Context, credentials WhoDBSourceCredentials) (*WhoDBHealth, error) {
	var out struct {
		Health WhoDBHealth `json:"Health"`
	}
	if err := c.query(ctx, credentials, "AccessHealth", "query AccessHealth { Health { Server Database } }", nil, &out); err != nil {
		return nil, err
	}
	return &out.Health, nil
}

func (c *WhoDBHTTPClient) ListObjects(ctx context.Context, credentials WhoDBSourceCredentials, parent *WhoDBObjectRef, kinds []string) ([]WhoDBObject, error) {
	var out struct {
		SourceObjects []struct {
			Ref struct {
				Kind string   `json:"Kind"`
				Path []string `json:"Path"`
			} `json:"Ref"`
			Kind        string   `json:"Kind"`
			Name        string   `json:"Name"`
			Path        []string `json:"Path"`
			HasChildren bool     `json:"HasChildren"`
			Attributes  []struct {
				Key   string `json:"Key"`
				Value string `json:"Value"`
			} `json:"Metadata"`
		} `json:"SourceObjects"`
	}
	variables := map[string]any{}
	if parent != nil {
		variables["parent"] = map[string]any{
			"Kind": parent.Kind,
			"Path": parent.Path,
		}
	}
	if len(kinds) > 0 {
		variables["kinds"] = kinds
	}
	err := c.query(
		ctx,
		credentials,
		"AccessObjects",
		"query AccessObjects($parent: SourceObjectRefInput, $kinds: [SourceObjectKind!]) { SourceObjects(parent: $parent, kinds: $kinds) { Ref { Kind Path } Kind Name Path HasChildren Metadata { Key Value } } }",
		variables,
		&out,
	)
	if err != nil {
		return nil, err
	}

	objects := make([]WhoDBObject, 0, len(out.SourceObjects))
	for _, object := range out.SourceObjects {
		metadata := make(map[string]string, len(object.Attributes))
		for _, attribute := range object.Attributes {
			metadata[attribute.Key] = attribute.Value
		}
		objects = append(objects, WhoDBObject{
			Ref: WhoDBObjectRef{
				Kind: object.Ref.Kind,
				Path: object.Ref.Path,
			},
			Kind:        object.Kind,
			Name:        object.Name,
			Path:        object.Path,
			HasChildren: object.HasChildren,
			Metadata:    metadata,
		})
	}
	return objects, nil
}

func (c *WhoDBHTTPClient) query(ctx context.Context, credentials WhoDBSourceCredentials, operationName, query string, variables map[string]any, out any) error {
	if c == nil || c.baseURL == "" {
		return ErrAccessHealthWhoDBMissing
	}
	if c.timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.timeout)
		defer cancel()
	}
	if variables == nil {
		variables = map[string]any{}
	}

	body := map[string]any{
		"operationName": operationName,
		"query":         query,
		"variables":     variables,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}
	tokenBytes, err := json.Marshal(credentials)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/query", bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+base64.StdEncoding.EncodeToString(tokenBytes))

	resp, err := c.client.Do(req)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return fmt.Errorf("%w: %v", ErrAccessHealthWhoDBTimeout, err)
		}
		return fmt.Errorf("%w: %v", ErrAccessHealthWhoDBUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusInternalServerError {
		return fmt.Errorf("%w: status %d", ErrAccessHealthWhoDBUnavailable, resp.StatusCode)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("%w: status %d", ErrAccessHealthWhoDBUnavailable, resp.StatusCode)
	}

	var response struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return fmt.Errorf("%w: %v", ErrAccessHealthWhoDBUnavailable, err)
	}
	if len(response.Errors) > 0 {
		return fmt.Errorf("%w: %s", ErrAccessHealthWhoDBUnavailable, response.Errors[0].Message)
	}
	if out != nil {
		if err := json.Unmarshal(response.Data, out); err != nil {
			return fmt.Errorf("%w: %v", ErrAccessHealthWhoDBUnavailable, err)
		}
	}
	return nil
}
