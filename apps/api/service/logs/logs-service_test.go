package logs

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExecuteLogsQueryReturnsEmptySliceWhenVictoriaLogsHasNoEntries(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("query"); got == "" {
			t.Fatal("query parameter was not forwarded")
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	entries, err := executeLogsQuery(
		context.Background(),
		server.URL,
		"{namespace='ns',container='postgresql'}",
		"1710000000",
		"1710003600",
	)
	if err != nil {
		t.Fatalf("executeLogsQuery returned error: %v", err)
	}
	if entries == nil {
		t.Fatal("executeLogsQuery returned a nil slice")
	}

	payload, err := json.Marshal(map[string][]map[string]interface{}{
		"postgresql": entries,
	})
	if err != nil {
		t.Fatalf("marshal response payload: %v", err)
	}
	if string(payload) != `{"postgresql":[]}` {
		t.Fatalf("empty log group encoded as %s, want empty array", payload)
	}
}
