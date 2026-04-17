package service

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/Masterminds/sprig/v3"
)

// Render parses a template string and executes it with the given values, returning the rendered string.
func Render(tmpl string, values any) (string, error) {
	t, err := template.New("").Funcs(sprig.TxtFuncMap()).Parse(tmpl)
	if err != nil {
		return "", fmt.Errorf("parse template: %w", err)
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, values); err != nil {
		return "", fmt.Errorf("execute template: %w", err)
	}
	return buf.String(), nil
}
