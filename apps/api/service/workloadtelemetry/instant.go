package workloadtelemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

var ErrNoVictoriaMetricsURL = fmt.Errorf("VMSELECT_URL is not configured")

type vmInstantResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Value  []interface{}     `json:"value"`
		} `json:"result"`
	} `json:"data"`
}

func NormalizeInstantResponse(raw []byte) (InstantSample, error) {
	var vm vmInstantResponse
	if err := json.Unmarshal(raw, &vm); err != nil {
		return InstantSample{}, err
	}
	if vm.Status != "success" || len(vm.Data.Result) == 0 {
		return InstantSample{}, ErrMetricUnavailable
	}

	var (
		count    int
		latest   time.Time
		valueSum float64
	)
	for _, series := range vm.Data.Result {
		if len(series.Value) < 2 {
			continue
		}
		ts, ok := instantTimestamp(series.Value[0])
		if !ok {
			continue
		}
		value, ok := instantFloat(series.Value[1])
		if !ok {
			continue
		}
		count++
		valueSum += value
		sampledAt := time.Unix(ts, 0).UTC()
		if sampledAt.After(latest) {
			latest = sampledAt
		}
	}
	if count == 0 {
		return InstantSample{}, ErrMetricUnavailable
	}
	return InstantSample{
		SampledAt: latest,
		Value:     valueSum / float64(count),
	}, nil
}

type vmInstantQuerier struct {
	client  *http.Client
	baseURL string
}

func NewVictoriaMetricsInstantQuerierFromEnv() (InstantQuerier, error) {
	endpoint, err := instantEndpointFromEnv()
	if err != nil {
		return nil, err
	}
	return &vmInstantQuerier{
		baseURL: endpoint,
		client:  &http.Client{Timeout: 10 * time.Second},
	}, nil
}

func (q *vmInstantQuerier) QueryInstant(ctx context.Context, req InstantQuery) (InstantSample, error) {
	u, err := url.Parse(q.baseURL)
	if err != nil {
		return InstantSample{}, err
	}
	values := u.Query()
	values.Set("query", req.Query)
	u.RawQuery = values.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return InstantSample{}, err
	}
	resp, err := q.client.Do(httpReq)
	if err != nil {
		return InstantSample{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return InstantSample{}, fmt.Errorf("VictoriaMetrics returned %s", resp.Status)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return InstantSample{}, err
	}
	return NormalizeInstantResponse(body)
}

func instantEndpointFromEnv() (string, error) {
	vmURL := strings.TrimSpace(os.Getenv("VMSELECT_URL"))
	if vmURL == "" {
		return "", ErrNoVictoriaMetricsURL
	}
	if strings.Contains(vmURL, "/api/v1/query_range") {
		return strings.Replace(vmURL, "/api/v1/query_range", "/api/v1/query", 1), nil
	}
	if strings.Contains(vmURL, "/api/v1/query") {
		return vmURL, nil
	}
	return strings.TrimRight(vmURL, "/") + "/api/v1/query", nil
}

func instantTimestamp(v interface{}) (int64, bool) {
	switch x := v.(type) {
	case float64:
		return int64(x), true
	case int:
		return int64(x), true
	case int64:
		return x, true
	case json.Number:
		n, err := x.Int64()
		return n, err == nil
	case string:
		if n, err := strconv.ParseInt(x, 10, 64); err == nil {
			return n, true
		}
		f, err := strconv.ParseFloat(x, 64)
		return int64(f), err == nil
	default:
		return 0, false
	}
}

func instantFloat(v interface{}) (float64, bool) {
	switch x := v.(type) {
	case float64:
		return x, true
	case int:
		return float64(x), true
	case int64:
		return float64(x), true
	case json.Number:
		f, err := x.Float64()
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(x, 64)
		return f, err == nil
	default:
		return 0, false
	}
}
