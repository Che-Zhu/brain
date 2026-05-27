{{- define "brain-system.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "brain-system.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" (include "brain-system.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "brain-system.labels" -}}
app.kubernetes.io/name: {{ include "brain-system.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{- define "brain-system.annotations" -}}
{{- with .Values.global.annotations }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{- define "brain-system.regionLabel" -}}
region: {{ required "global.region is required" .Values.global.region | quote }}
{{- end -}}

{{- define "brain-system.secretEnvRef" -}}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ .secretName }}
      key: {{ .name }}
{{- if .optional }}
      optional: true
{{- end }}
{{- end -}}

{{- define "brain-system.envValue" -}}
- name: {{ .name }}
  value: {{ .value | quote }}
{{- end -}}
