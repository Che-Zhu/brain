package notif

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"sigs.k8s.io/yaml"
)

// sealosNotifWebhookBody is accepted as either:
//   - Compact Sealos-oriented JSON - fields below (recommended for templated POST bodies); or
//   - Grafana's default webhook envelope when `alerts` is populated (receiver, alerts[], commonLabels, etc.).
//
// Pointer string fields are optional in JSON except when deriving a usable Notif (see buildNotifTitle/buildNotifBody).
type sealosNotifWebhookBody struct {
	_ struct{} `json:"-" additionalProperties:"true"` // allow Grafana extra root keys (groupLabels, truncatedAlerts, etc.)

	// Title is the Notif headline (also used if content is built from summary/description only).
	Title *string `json:"title,omitempty"`
	// Content is the full body; if empty, summary and/or description are combined.
	Content *string `json:"content,omitempty"`
	Summary *string `json:"summary,omitempty"`
	// Description is appended to summary when building content.
	Description *string `json:"description,omitempty"`
	// Severity is one of info, success, warning, error (case-insensitive). Mapped from legacy label values if empty.
	Severity *string `json:"severity,omitempty"`
	// Category defaults to "grafana" when empty.
	Category *string `json:"category,omitempty"`
	// Status is optional (e.g. firing, resolved) and affects default severity when severity is empty.
	Status *string `json:"status,omitempty"`
	Link   *string `json:"link,omitempty"`
	// DedupeKey identifies the alert for spec.dedupeKey and metadata.name (sanitized). Strongly recommended.
	DedupeKey *string `json:"dedupeKey,omitempty"`
	// Alertname is optional context (also used for title fallback).
	Alertname *string `json:"alertname,omitempty"`
	StartsAt  *string `json:"startsAt,omitempty"`
	// ExpiresAt is optional RFC3339 for spec.expiresAt.
	ExpiresAt *string           `json:"expiresAt,omitempty"`
	Labels    map[string]string `json:"labels,omitempty"`

	// --- Grafana default webhook envelope (unified alerting) ---
	Receiver          *string                `json:"receiver,omitempty"`
	ExternalURL       *string                `json:"externalURL,omitempty"`
	GroupKey          *string                `json:"groupKey,omitempty"`
	Version           *string                `json:"version,omitempty"`
	OrgID             *int                   `json:"orgId,omitempty"`
	State             *string                `json:"state,omitempty"`
	Message           *string                `json:"message,omitempty"`
	CommonLabels      map[string]string      `json:"commonLabels,omitempty"`
	CommonAnnotations map[string]string      `json:"commonAnnotations,omitempty"`
	GroupLabels       map[string]string      `json:"groupLabels,omitempty"`
	TruncatedAlerts   *int                   `json:"truncatedAlerts,omitempty"`
	Alerts            []grafanaWebhookAlert  `json:"alerts,omitempty"`
	SealosAugment     map[string]interface{} `json:"-"` // merge into spec.data (set when translating from Grafana alerts[])
}

type grafanaWebhookAlert struct {
	_ struct{} `json:"-" additionalProperties:"true"` // allow Grafana extra per-alert keys (silenceURL, imageURL, etc.)

	Status       *string           `json:"status,omitempty"`
	Labels       map[string]string `json:"labels,omitempty"`
	Annotations  map[string]string `json:"annotations,omitempty"`
	StartsAt     *string           `json:"startsAt,omitempty"`
	EndsAt       *string           `json:"endsAt,omitempty"`
	GeneratorURL *string           `json:"generatorURL,omitempty"`
	Fingerprint  *string           `json:"fingerprint,omitempty"`
	ValueString  *string           `json:"valueString,omitempty"`
	Values       json.RawMessage   `json:"values,omitempty"`
	SilenceURL   *string           `json:"silenceURL,omitempty"`
	DashboardURL *string           `json:"dashboardURL,omitempty"`
	PanelURL     *string           `json:"panelURL,omitempty"`
	ImageURL     *string           `json:"imageURL,omitempty"`
	URL          *string           `json:"url,omitempty"` // some Grafana variants
}

func strPtr(p *string) string {
	if p == nil {
		return ""
	}
	return strings.TrimSpace(*p)
}

func buildNotifTitle(p *sealosNotifWebhookBody) string {
	if s := strPtr(p.Title); s != "" {
		return s
	}
	if s := strPtr(p.Alertname); s != "" {
		return s
	}
	if s := strPtr(p.Summary); s != "" {
		return s
	}
	return "Alert"
}

func buildNotifBody(p *sealosNotifWebhookBody) string {
	if c := strPtr(p.Content); c != "" {
		return c
	}
	var sb strings.Builder
	if s := strPtr(p.Summary); s != "" {
		sb.WriteString(s)
	}
	if d := strPtr(p.Description); d != "" {
		if sb.Len() > 0 {
			sb.WriteString("\n\n")
		}
		sb.WriteString(d)
	}
	out := strings.TrimSpace(sb.String())
	if out != "" {
		return out
	}
	// Grafana often puts a templated JSON fragment or text in root `message`; use when nothing else fills body.
	if m := strings.TrimSpace(strPtr(p.Message)); m != "" {
		return m
	}
	return strPtr(p.Status)
}

func normalizeNotifSeverity(p *sealosNotifWebhookBody) string {
	sev := strings.ToLower(strPtr(p.Severity))
	switch sev {
	case "critical", "fatal", "page", "emergency":
		return "error"
	case "warn", "warning":
		return "warning"
	case "success", "none", "ok":
		return "success"
	case "info", "informational", "debug":
		return "info"
	}
	if sev := strings.ToLower(labelOr(p.Labels, "severity")); sev != "" {
		switch sev {
		case "critical", "fatal", "page", "emergency":
			return "error"
		case "warn", "warning":
			return "warning"
		case "success", "none", "ok":
			return "success"
		case "info", "informational", "debug":
			return "info"
		}
	}
	st := strings.ToLower(strPtr(p.Status))
	if st == "resolved" {
		return "success"
	}
	return "warning"
}

func buildCategory(p *sealosNotifWebhookBody) string {
	if c := strPtr(p.Category); c != "" {
		return c
	}
	if c := strings.TrimSpace(labelOr(p.Labels, "category")); c != "" {
		return c
	}
	return "grafana"
}

func parseExpiresAt(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || strings.HasPrefix(s, "0001-01-01") {
		return ""
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

func notifObjectNameFromPayload(p *sealosNotifWebhookBody) string {
	base := strPtr(p.DedupeKey)
	if base == "" {
		h := sha256.Sum256([]byte(
			strPtr(p.Title) +
				strPtr(p.Alertname) +
				strPtr(p.StartsAt) +
				strPtr(p.Status) +
				buildNotifBody(p),
		))
		base = hex.EncodeToString(h[:12])
	}
	name := "graf-" + strings.ToLower(base)
	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-':
			b.WriteRune(r)
		default:
			b.WriteRune('-')
		}
	}
	name = strings.Trim(b.String(), "-")
	if len(name) > 63 {
		name = name[:63]
	}
	name = strings.Trim(name, "-")
	if name == "" || name == "graf" {
		sum := sha256.Sum256([]byte(base))
		name = "graf-" + hex.EncodeToString(sum[:6])
	}
	if len(name) > 63 {
		name = name[:63]
	}
	return name
}

// sealosPayloadsFromBody expands Grafana `alerts[]` envelopes into compact payloads (one per alert).
func sealosPayloadsFromBody(envelope *sealosNotifWebhookBody) []*sealosNotifWebhookBody {
	if envelope == nil {
		return nil
	}
	if len(envelope.Alerts) == 0 {
		return []*sealosNotifWebhookBody{envelope}
	}
	out := make([]*sealosNotifWebhookBody, 0, len(envelope.Alerts))
	for i := range envelope.Alerts {
		q := alertRowToSealos(&envelope.Alerts[i], envelope)
		if q != nil {
			out = append(out, q)
		}
	}
	if len(out) == 0 {
		return []*sealosNotifWebhookBody{envelope}
	}
	return out
}

func alertRowToSealos(row *grafanaWebhookAlert, env *sealosNotifWebhookBody) *sealosNotifWebhookBody {
	if row == nil || env == nil {
		return nil
	}
	labels := mergeStringMapsPreferSecond(env.CommonLabels, row.Labels)
	ann := mergeStringMapsPreferSecond(env.CommonAnnotations, row.Annotations)
	summary := strings.TrimSpace(ann["summary"])
	desc := strings.TrimSpace(ann["description"])
	alertname := labelOr(labels, "alertname")
	title := strings.TrimSpace(firstNonEmpty(summary, alertname, strPtr(env.Title)))
	if title == "" {
		title = "Grafana alert"
	}
	var sb strings.Builder
	if summary != "" {
		sb.WriteString(summary)
	}
	if desc != "" {
		if sb.Len() > 0 {
			sb.WriteString("\n\n")
		}
		sb.WriteString(desc)
	}
	if vs := strPtr(row.ValueString); vs != "" {
		if sb.Len() > 0 {
			sb.WriteString("\n\n")
		}
		sb.WriteString(vs)
	}
	body := strings.TrimSpace(sb.String())
	if body == "" {
		body = strings.TrimSpace(firstNonEmpty(strPtr(row.Status), strPtr(env.Status)))
	}

	sevStr := strings.TrimSpace(labelOr(labels, "severity"))
	if sevStr == "" {
		sevStr = strings.TrimSpace(ann["severity"])
	}

	dedupe := strPtr(row.Fingerprint)
	if dedupe == "" {
		h := sha256.Sum256([]byte(strPtr(row.StartsAt) + alertname + strPtr(env.GroupKey)))
		dedupe = hex.EncodeToString(h[:12])
	}

	linkOut := ""
	if u := strPtr(row.GeneratorURL); u != "" {
		linkOut = u
	} else if u := strPtr(env.ExternalURL); u != "" {
		linkOut = u
	}

	st := strings.TrimSpace(firstNonEmpty(strPtr(row.Status), strPtr(env.Status)))

	var vals any
	if len(row.Values) > 0 {
		_ = json.Unmarshal(row.Values, &vals)
	}

	stAug := map[string]interface{}{}
	stAug["receiver"] = strPtr(env.Receiver)
	stAug["status"] = st
	stAug["externalURL"] = strPtr(env.ExternalURL)
	stAug["groupKey"] = strPtr(env.GroupKey)
	if env.OrgID != nil {
		stAug["orgId"] = *env.OrgID
	}
	stAug["valueString"] = strPtr(row.ValueString)
	stAug["fingerprint"] = strPtr(row.Fingerprint)
	stAug["endsAt"] = strPtr(row.EndsAt)
	if vals != nil {
		stAug["values"] = vals
	}

	p := &sealosNotifWebhookBody{
		Title:         nullableNonEmpty(title),
		Content:       nullableNonEmpty(body),
		Severity:      nullableNonEmpty(strings.TrimSpace(sevStr)),
		Category:      nullableNonEmpty("grafana"),
		Status:        nullableNonEmpty(st),
		Link:          nullableNonEmpty(linkOut),
		DedupeKey:     nullableNonEmpty(dedupe),
		Alertname:     nullableNonEmpty(strings.TrimSpace(alertname)),
		StartsAt:      row.StartsAt,
		ExpiresAt:     nil,
		Labels:        labels,
		SealosAugment: map[string]interface{}{"grafana": stAug},
	}
	if row.EndsAt != nil && parseExpiresAt(*row.EndsAt) != "" {
		t := strings.TrimSpace(*row.EndsAt)
		copy := t
		p.ExpiresAt = &copy
	}
	return p
}

func nullableNonEmpty(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	v := s
	return &v
}

func mergeStringMapsPreferSecond(a, b map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range a {
		out[k] = v
	}
	for k, v := range b {
		out[k] = v
	}
	if len(out) == 0 {
		return map[string]string{}
	}
	return out
}

func optionalSourceRefFromLabels(labels map[string]string) map[string]interface{} {
	ns := strings.TrimSpace(labelOr(labels, "namespace"))
	name := strings.TrimSpace(labelOr(labels, "pod"))
	if ns == "" || name == "" {
		return nil
	}
	return map[string]interface{}{
		"apiVersion": "v1",
		"kind":       "Pod",
		"name":       name,
		"namespace":  ns,
	}
}

// notifYAMLFromSealos builds a single Notif manifest for server-side apply.
func notifYAMLFromSealos(p *sealosNotifWebhookBody, namespace, projectName string) ([]byte, error) {
	title := buildNotifTitle(p)
	content := buildNotifBody(p)
	if strings.TrimSpace(title) == "" && strings.TrimSpace(content) == "" {
		return nil, errEmptyWebhookPayload
	}

	metaName := notifObjectNameFromPayload(p)
	labels := p.Labels
	if labels == nil {
		labels = map[string]string{}
	}

	notification := map[string]interface{}{
		"title":     title,
		"content":   content,
		"severity":  normalizeNotifSeverity(p),
		"category":  buildCategory(p),
		"link":      strPtr(p.Link),
		"read":      false,
		"archived":  false,
		"dedupeKey": strings.TrimSpace(firstNonEmpty(strPtr(p.DedupeKey), metaName)),
		"data":      mergeSealosSpecData(labels, p),
	}

	if exp := parseExpiresAt(strPtr(p.ExpiresAt)); exp != "" {
		notification["expiresAt"] = exp
	}
	if strings.TrimSpace(projectName) != "" {
		notification["projectName"] = strings.TrimSpace(projectName)
	}
	if sr := optionalSourceRefFromLabels(labels); sr != nil {
		notification["sourceRef"] = sr
	}

	manifest := map[string]interface{}{
		"apiVersion": "example.crossplane.io/v1",
		"kind":       "Notif",
		"metadata": map[string]interface{}{
			"name":      metaName,
			"namespace": namespace,
			"labels": map[string]string{
				"notifications.sealos.io/source": "grafana",
			},
		},
		"spec": map[string]interface{}{
			"notification": notification,
		},
	}
	return yaml.Marshal(manifest)
}

func mergeSealosSpecData(labels map[string]string, p *sealosNotifWebhookBody) map[string]interface{} {
	data := map[string]interface{}{
		"producer": "grafana",
		"status":   strPtr(p.Status),
		"alertname": strings.TrimSpace(firstNonEmpty(
			strPtr(p.Alertname),
			labelOr(labels, "alertname"),
		)),
		"startsAt": strPtr(p.StartsAt),
		"labels":   labels,
	}
	if p.SealosAugment != nil {
		for k, v := range p.SealosAugment {
			data[k] = v
		}
	}
	return data
}

// errEmptyWebhookPayload is returned when the body cannot derive a title nor any message text.
var errEmptyWebhookPayload = errors.New("title/content or summary/description required")

func labelOr(m map[string]string, key string) string {
	if m == nil {
		return ""
	}
	return m[key]
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
