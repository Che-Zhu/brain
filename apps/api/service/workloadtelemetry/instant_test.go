package workloadtelemetry

import (
	"errors"
	"testing"
	"time"
)

func TestNormalizeInstantResponseAveragesVectorSamples(t *testing.T) {
	raw := []byte(`{
		"status": "success",
		"data": {
			"resultType": "vector",
			"result": [
				{"metric": {"pod": "web-0"}, "value": [1779100200, "10"]},
				{"metric": {"pod": "web-1"}, "value": [1779100260, "14"]}
			]
		}
	}`)

	got, err := NormalizeInstantResponse(raw)
	if err != nil {
		t.Fatalf("NormalizeInstantResponse returned error: %v", err)
	}
	if got.Value != 12 {
		t.Fatalf("value = %v, want 12", got.Value)
	}
	wantSampledAt := time.Unix(1_779_100_260, 0).UTC()
	if !got.SampledAt.Equal(wantSampledAt) {
		t.Fatalf("sampledAt = %s, want %s", got.SampledAt, wantSampledAt)
	}
}

func TestNormalizeInstantResponseTreatsEmptyVectorAsUnavailable(t *testing.T) {
	raw := []byte(`{"status": "success", "data": {"resultType": "vector", "result": []}}`)

	_, err := NormalizeInstantResponse(raw)
	if !errors.Is(err, ErrMetricUnavailable) {
		t.Fatalf("error = %v, want ErrMetricUnavailable", err)
	}
}
