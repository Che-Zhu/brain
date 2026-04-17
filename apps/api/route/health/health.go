package health

// Output is the shared response for health check endpoints.
type Output struct {
	Body struct {
		Status string `json:"status" example:"ok" doc:"Service status"`
	}
}
