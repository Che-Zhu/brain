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
	if c == nil || c.baseURL == "" {
		return nil, ErrAccessHealthWhoDBMissing
	}
	if c.timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.timeout)
		defer cancel()
	}

	body := map[string]any{
		"operationName": "AccessHealth",
		"query":         "query AccessHealth { Health { Server Database } }",
		"variables":     map[string]any{},
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	tokenBytes, err := json.Marshal(credentials)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/query", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+base64.StdEncoding.EncodeToString(tokenBytes))

	resp, err := c.client.Do(req)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nil, fmt.Errorf("%w: %v", ErrAccessHealthWhoDBTimeout, err)
		}
		return nil, fmt.Errorf("%w: %v", ErrAccessHealthWhoDBUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusInternalServerError {
		return nil, fmt.Errorf("%w: status %d", ErrAccessHealthWhoDBUnavailable, resp.StatusCode)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("%w: status %d", ErrAccessHealthWhoDBUnavailable, resp.StatusCode)
	}

	var out struct {
		Data struct {
			Health WhoDBHealth `json:"Health"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrAccessHealthWhoDBUnavailable, err)
	}
	if len(out.Errors) > 0 {
		return nil, fmt.Errorf("%w: %s", ErrAccessHealthWhoDBUnavailable, out.Errors[0].Message)
	}
	return &out.Data.Health, nil
}
