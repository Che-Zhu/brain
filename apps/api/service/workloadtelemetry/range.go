package workloadtelemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"
)

type vmRangeResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Values [][]interface{}   `json:"values"`
		} `json:"result"`
	} `json:"data"`
}

func NormalizeRangeResponse(raw []byte) ([]SeriesSample, error) {
	var vm vmRangeResponse
	if err := json.Unmarshal(raw, &vm); err != nil {
		return nil, err
	}
	if vm.Status != "success" || len(vm.Data.Result) == 0 {
		return nil, ErrMetricUnavailable
	}

	byTimestamp := make(map[int64][]float64)
	for _, series := range vm.Data.Result {
		for _, pair := range series.Values {
			if len(pair) < 2 {
				continue
			}
			ts, ok := instantTimestamp(pair[0])
			if !ok {
				continue
			}
			value, ok := instantFloat(pair[1])
			if !ok {
				continue
			}
			byTimestamp[ts] = append(byTimestamp[ts], value)
		}
	}
	if len(byTimestamp) == 0 {
		return nil, ErrMetricUnavailable
	}

	timestamps := make([]int64, 0, len(byTimestamp))
	for timestamp := range byTimestamp {
		timestamps = append(timestamps, timestamp)
	}
	sort.Slice(timestamps, func(i int, j int) bool {
		return timestamps[i] < timestamps[j]
	})

	samples := make([]SeriesSample, 0, len(timestamps))
	for _, timestamp := range timestamps {
		values := byTimestamp[timestamp]
		var sum float64
		for _, value := range values {
			sum += value
		}
		samples = append(samples, SeriesSample{
			Timestamp: timestamp,
			Value:     sum / float64(len(values)),
		})
	}
	return samples, nil
}

type vmRangeQuerier struct {
	baseURL string
	client  *http.Client
}

func NewVictoriaMetricsRangeQuerier(baseURL string) RangeQuerier {
	return &vmRangeQuerier{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 20 * time.Second},
	}
}

func NewVictoriaMetricsRangeQuerierFromEnv() (RangeQuerier, error) {
	endpoint, err := rangeEndpointFromEnv()
	if err != nil {
		return nil, err
	}
	return NewVictoriaMetricsRangeQuerier(endpoint), nil
}

func (q *vmRangeQuerier) QueryRange(ctx context.Context, req RangeQuery) ([]SeriesSample, error) {
	u, err := url.Parse(q.baseURL)
	if err != nil {
		return nil, err
	}
	values := u.Query()
	values.Set("end", fmt.Sprintf("%d", req.End.Unix()))
	values.Set("query", req.Query)
	values.Set("start", fmt.Sprintf("%d", req.Start.Unix()))
	values.Set("step", promDuration(req.Step))
	u.RawQuery = values.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := q.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("VictoriaMetrics returned %s", resp.Status)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return NormalizeRangeResponse(body)
}

func rangeEndpointFromEnv() (string, error) {
	vmURL := strings.TrimSpace(os.Getenv("VMSELECT_URL"))
	if vmURL == "" {
		return "", ErrNoVictoriaMetricsURL
	}
	if strings.Contains(vmURL, "/api/v1/query_range") {
		return vmURL, nil
	}
	if strings.Contains(vmURL, "/api/v1/query") {
		return strings.Replace(vmURL, "/api/v1/query", "/api/v1/query_range", 1), nil
	}
	return strings.TrimRight(vmURL, "/") + "/api/v1/query_range", nil
}

func promDuration(duration time.Duration) string {
	if duration%time.Second == 0 {
		return fmt.Sprintf("%ds", int64(duration/time.Second))
	}
	return duration.String()
}
