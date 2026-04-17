package metrics

import (
	"encoding/json"
	"sort"
	"strconv"
)

// vmMatrixResult is the VictoriaMetrics matrix response for a single metric.
type vmMatrixResult struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Values [][]interface{}   `json:"values"`
		} `json:"result"`
	} `json:"data"`
}

// FlattenMetricsResponse converts raw VictoriaMetrics responses into a time-series array.
// Input: map of metric name -> raw VM JSON (status, data.result[].values).
// Output: [{ time, cpu, memory, ... }, ...] sorted by time.
func FlattenMetricsResponse(raw map[string]json.RawMessage) ([]map[string]interface{}, error) {
	// metric name -> timestamp -> []values (for averaging)
	byMetric := make(map[string]map[int64][]float64)

	for metricName, rawMsg := range raw {
		var vm vmMatrixResult
		if err := json.Unmarshal(rawMsg, &vm); err != nil {
			return nil, err
		}
		if vm.Status != "success" || len(vm.Data.Result) == 0 {
			continue
		}
		byMetric[metricName] = make(map[int64][]float64)
		for _, series := range vm.Data.Result {
			for _, pair := range series.Values {
				if len(pair) < 2 {
					continue
				}
				ts, ok := toInt64(pair[0])
				if !ok {
					continue
				}
				val, ok := toFloat64(pair[1])
				if !ok {
					continue
				}
				byMetric[metricName][ts] = append(byMetric[metricName][ts], val)
			}
		}
	}

	// Average values per timestamp per metric
	avgByMetric := make(map[string]map[int64]float64)
	for metricName, m := range byMetric {
		avgByMetric[metricName] = make(map[int64]float64)
		for ts, vals := range m {
			var sum float64
			for _, v := range vals {
				sum += v
			}
			avgByMetric[metricName][ts] = sum / float64(len(vals))
		}
	}

	// Collect all unique timestamps
	tsSet := make(map[int64]struct{})
	for _, m := range avgByMetric {
		for ts := range m {
			tsSet[ts] = struct{}{}
		}
	}
	timestamps := make([]int64, 0, len(tsSet))
	for ts := range tsSet {
		timestamps = append(timestamps, ts)
	}
	sort.Slice(timestamps, func(i, j int) bool { return timestamps[i] < timestamps[j] })

	// Build output
	out := make([]map[string]interface{}, 0, len(timestamps))
	for _, ts := range timestamps {
		pt := map[string]interface{}{"time": ts}
		for metricName, m := range avgByMetric {
			if v, ok := m[ts]; ok {
				pt[metricName] = v
			}
		}
		out = append(out, pt)
	}
	return out, nil
}

func toInt64(v interface{}) (int64, bool) {
	switch x := v.(type) {
	case float64:
		return int64(x), true
	case int:
		return int64(x), true
	case int64:
		return x, true
	case string:
		n, err := strconv.ParseInt(x, 10, 64)
		return n, err == nil
	default:
		return 0, false
	}
}

func toFloat64(v interface{}) (float64, bool) {
	switch x := v.(type) {
	case float64:
		return x, true
	case int:
		return float64(x), true
	case int64:
		return float64(x), true
	case string:
		f, err := strconv.ParseFloat(x, 64)
		return f, err == nil
	default:
		return 0, false
	}
}
