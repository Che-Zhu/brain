package workloadtelemetry

import (
	"context"
	"sort"
	"time"
)

const (
	maxSeriesRange   = 24 * time.Hour
	maxSeriesSamples = 1440
	minSeriesStep    = 30 * time.Second
)

type SeriesRequest struct {
	End    time.Time
	Start  time.Time
	Step   time.Duration
	Target Target
}

type SeriesSample struct {
	Timestamp int64
	Value     float64
}

type SeriesRow map[string]float64

type SeriesResponse struct {
	MetricErrors map[MetricKey]ItemError `json:"metricErrors,omitempty"`
	Rows         []SeriesRow             `json:"rows"`
	Target       Target                  `json:"target"`
}

type RangeQuery struct {
	End    time.Time
	Key    MetricKey
	Query  string
	Start  time.Time
	Step   time.Duration
	Target Target
}

func (s *Service) Series(ctx context.Context, auth string, req SeriesRequest) (SeriesResponse, error) {
	if err := validateSeriesWindow(req.Start, req.End, req.Step); err != nil {
		return SeriesResponse{}, err
	}

	profiles, err := s.metricProfiles(ctx, auth, req.Target)
	if err != nil {
		return SeriesResponse{}, err
	}

	response := SeriesResponse{
		Rows:   []SeriesRow{},
		Target: req.Target,
	}
	samplesByMetric := make(map[MetricKey][]SeriesSample, len(profiles))
	for _, profile := range profiles {
		samples, err := s.queryRangeMetric(ctx, req, profile)
		if err != nil {
			response.addMetricError(profile.key, err)
			continue
		}
		samplesByMetric[profile.key] = samples
	}
	response.Rows = seriesRows(samplesByMetric)
	return response, nil
}

func validateSeriesWindow(start time.Time, end time.Time, step time.Duration) error {
	switch {
	case start.IsZero(), end.IsZero(), step <= 0:
		return ErrInvalidSamplingWindow
	case !start.Before(end):
		return ErrInvalidSamplingWindow
	case end.Sub(start) > maxSeriesRange:
		return ErrInvalidSamplingWindow
	case step < minSeriesStep:
		return ErrInvalidSamplingWindow
	case int(end.Sub(start)/step)+1 > maxSeriesSamples:
		return ErrInvalidSamplingWindow
	default:
		return nil
	}
}

func (s *Service) queryRangeMetric(ctx context.Context, req SeriesRequest, profile metricProfile) ([]SeriesSample, error) {
	if s.rangeQuerier == nil {
		return nil, ErrMetricUnavailable
	}
	return s.rangeQuerier.QueryRange(ctx, RangeQuery{
		End:    req.End,
		Key:    profile.key,
		Query:  profile.query,
		Start:  req.Start,
		Step:   req.Step,
		Target: req.Target,
	})
}

func (response *SeriesResponse) addMetricError(key MetricKey, err error) {
	if response.MetricErrors == nil {
		response.MetricErrors = make(map[MetricKey]ItemError)
	}
	response.MetricErrors[key] = *itemError(err)
}

func seriesRows(samplesByMetric map[MetricKey][]SeriesSample) []SeriesRow {
	byTimestamp := make(map[int64]SeriesRow)
	for key, samples := range samplesByMetric {
		for _, sample := range samples {
			row, ok := byTimestamp[sample.Timestamp]
			if !ok {
				row = SeriesRow{"time": float64(sample.Timestamp)}
				byTimestamp[sample.Timestamp] = row
			}
			row[string(key)] = sample.Value
		}
	}

	timestamps := make([]int64, 0, len(byTimestamp))
	for timestamp := range byTimestamp {
		timestamps = append(timestamps, timestamp)
	}
	sort.Slice(timestamps, func(i int, j int) bool {
		return timestamps[i] < timestamps[j]
	})

	rows := make([]SeriesRow, 0, len(timestamps))
	for _, timestamp := range timestamps {
		rows = append(rows, byTimestamp[timestamp])
	}
	return rows
}
