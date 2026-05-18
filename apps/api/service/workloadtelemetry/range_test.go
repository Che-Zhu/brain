package workloadtelemetry

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNormalizeRangeResponseAveragesMatrixSamples(t *testing.T) {
	raw := []byte(`{
		"status": "success",
		"data": {
			"resultType": "matrix",
			"result": [
				{"metric": {"pod": "web-0"}, "values": [[1779100200, "10"], [1779100260, "14"]]},
				{"metric": {"pod": "web-1"}, "values": [[1779100200, "20"], [1779100260, "18"]]}
			]
		}
	}`)

	got, err := NormalizeRangeResponse(raw)
	if err != nil {
		t.Fatalf("NormalizeRangeResponse returned error: %v", err)
	}

	want := []SeriesSample{
		{Timestamp: 1_779_100_200, Value: 15},
		{Timestamp: 1_779_100_260, Value: 16},
	}
	if len(got) != len(want) {
		t.Fatalf("samples length = %d, want %d: %#v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("sample[%d] = %#v, want %#v", i, got[i], want[i])
		}
	}
}

func TestNormalizeRangeResponseTreatsEmptyMatrixAsUnavailable(t *testing.T) {
	raw := []byte(`{"status": "success", "data": {"resultType": "matrix", "result": []}}`)

	_, err := NormalizeRangeResponse(raw)
	if !errors.Is(err, ErrMetricUnavailable) {
		t.Fatalf("error = %v, want ErrMetricUnavailable", err)
	}
}

func TestVictoriaMetricsRangeQuerierSendsSamplingWindow(t *testing.T) {
	start := time.Date(2026, 5, 18, 10, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		if query.Get("query") != "up" {
			t.Fatalf("query = %q, want up", query.Get("query"))
		}
		if query.Get("start") != "1779098400" || query.Get("end") != "1779102000" || query.Get("step") != "60s" {
			t.Fatalf("sampling window query = %s", r.URL.RawQuery)
		}
		_, _ = w.Write([]byte(`{
			"status": "success",
			"data": {"resultType": "matrix", "result": [{"values": [[1779098400, "7"]]}]}
		}`))
	}))
	defer server.Close()

	querier := NewVictoriaMetricsRangeQuerier(server.URL + "/api/v1/query_range")
	got, err := querier.QueryRange(context.Background(), RangeQuery{
		End:    end,
		Query:  "up",
		Start:  start,
		Step:   time.Minute,
		Target: Target{Kind: WorkloadKindAP, Namespace: "project-a", Name: "web"},
	})
	if err != nil {
		t.Fatalf("QueryRange returned error: %v", err)
	}
	if len(got) != 1 || got[0].Value != 7 {
		t.Fatalf("samples = %#v, want one value 7", got)
	}
}
