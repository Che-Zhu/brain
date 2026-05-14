package db

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
)

// DBPausedPatch returns the narrow merge patch used for DB start/stop.
func DBPausedPatch(paused bool) ([]byte, error) {
	return json.Marshal(map[string]interface{}{
		"spec": map[string]interface{}{
			"paused": paused,
		},
	})
}

// DBRestartPatch increments spec.restartRequest from the current DB JSON.
func DBRestartPatch(current []byte) ([]byte, error) {
	var obj struct {
		Spec map[string]interface{} `json:"spec"`
	}
	decoder := json.NewDecoder(bytes.NewReader(current))
	decoder.UseNumber()
	if err := decoder.Decode(&obj); err != nil {
		return nil, fmt.Errorf("decode DB: %w", err)
	}

	currentRequest := int64(0)
	if obj.Spec != nil {
		raw, ok := obj.Spec["restartRequest"]
		if ok {
			parsed, err := restartRequestValue(raw)
			if err != nil {
				return nil, err
			}
			currentRequest = parsed
		}
	}
	nextRequest := currentRequest + 1

	return json.Marshal(map[string]interface{}{
		"spec": map[string]interface{}{
			"restartRequest": nextRequest,
		},
	})
}

func restartRequestValue(raw interface{}) (int64, error) {
	var value int64
	switch v := raw.(type) {
	case json.Number:
		parsed, err := strconv.ParseInt(v.String(), 10, 64)
		if err != nil {
			return 0, fmt.Errorf("restartRequest must be an integer: %w", err)
		}
		value = parsed
	case float64:
		if v != float64(int64(v)) {
			return 0, fmt.Errorf("restartRequest must be an integer")
		}
		value = int64(v)
	case int:
		value = int64(v)
	case int64:
		value = v
	default:
		return 0, fmt.Errorf("restartRequest must be an integer")
	}
	if value < 0 {
		return 0, fmt.Errorf("restartRequest must be non-negative")
	}
	return value, nil
}
