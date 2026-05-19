#!/usr/bin/env python3
"""
Regenerate *-composite.yaml from Sealos template index.yaml (Helm-style inline manifests).

Preserves Crossplane region / projectName behavior and adds spec params for inputs & defaults.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

TEMPLATES_DIR = Path(__file__).resolve().parent
SEALOS_ROOT = Path("/Users/mac/Downloads/templates/template")

# composite stem -> sealos folder name (when they differ)
SEALOS_DIR_ALIASES: dict[str, str] = {
    "jupyter-docker-stacks": "docker-stacks",
    "featbit": "featbit-standard",
    "palworld-mg": "palworld",
    "stirling-pdf": "s-pdf",
    "drizzle-gateway": "drizzle-studio",
}

NAMESPACED_KINDS = {
    "ConfigMap",
    "CronJob",
    "DaemonSet",
    "Deployment",
    "Ingress",
    "Job",
    "PersistentVolumeClaim",
    "Pod",
    "Secret",
    "Service",
    "ServiceAccount",
    "StatefulSet",
    "Role",
    "RoleBinding",
    "Object",
}

WORKLOAD_KINDS = {"Deployment", "StatefulSet", "DaemonSet"}

PROJECT_OBSERVE = """\
{{- if ne $projectName "" }}
---
apiVersion: kubernetes.m.crossplane.io/v1alpha1
kind: Object
metadata:
  name: {{ printf "%s-project-observe" $name }}
  namespace: {{ $ns }}
  annotations:
    gotemplating.fn.crossplane.io/composition-resource-name: project-observe
    gotemplating.fn.crossplane.io/ready: "True"
spec:
  managementPolicies:
    - Observe
  providerConfigRef:
    kind: ClusterProviderConfig
    name: default
  forProvider:
    manifest:
      apiVersion: example.crossplane.io/v1
      kind: Project
      metadata:
        name: {{ $projectName }}
        namespace: {{ $ns }}
{{- end }}"""

AP_PROJECT_PATCH = """\
{{ if and (ne $projectName "") (ne $projectUid "") }}
apiVersion: kubernetes.m.crossplane.io/v1alpha1
kind: Object
metadata:
  name: {{ printf "%s-ap-project-patch" $name }}
  namespace: {{ $ns }}
  annotations:
    gotemplating.fn.crossplane.io/composition-resource-name: ap-project-patch
    gotemplating.fn.crossplane.io/ready: "True"
spec:
  managementPolicies:
    - Observe
    - Create
    - Update
  providerConfigRef:
    kind: ClusterProviderConfig
    name: default
  forProvider:
    manifest:
      apiVersion: example.crossplane.io/v1
      kind: AP
      metadata:
        name: {{ $name }}
        namespace: {{ $ns }}
        labels:
          crossplane.io/project-name: {{ $projectName | quote }}
          crossplane.io/project-uid: {{ $projectUid | quote }}
        ownerReferences:
        - apiVersion: example.crossplane.io/v1
          kind: Project
          name: {{ $projectName }}
          uid: {{ $projectUid }}
{{ end }}"""

STATUS_BLOCK = """\
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: {{ .observed.composite.resource.metadata.name }}
  namespace: {{ $ns }}
status:
  phase: Ready
  {{ if ne $projectName "" }}
  projectName: {{ $projectName | quote }}
  {{ end }}
  {{ if ne $projectUid "" }}
  projectUid: {{ $projectUid | quote }}
  {{ end }}"""

# Footer is one join chunk: join adds --- after App; only add --- before status when patch rendered.
COMPOSITION_FOOTER = f"""{AP_PROJECT_PATCH.strip()}
{{{{- if and (ne $projectName "") (ne $projectUid "") }}}}
---
{{{{- end }}}}
{STATUS_BLOCK.strip()}"""

GO_HEADER = """\
{{- $name := .observed.composite.resource.spec.name | default .observed.composite.resource.metadata.name }}
{{- $uid := printf "%s" (index .observed.composite.resource.metadata "uid" | default "") -}}
{{- $suffix := (replace "-" "" $uid | trunc 4) | default (sha256sum (printf "%s-%s" .observed.composite.resource.metadata.namespace .observed.composite.resource.metadata.name) | trunc 4) }}
{{- $appName := printf "%s-%s" $name $suffix }}
{{- $deployId := printf "%s-%s" $name $suffix }}
{{- $ns := .observed.composite.resource.metadata.namespace }}
{{- $spec := .observed.composite.resource.spec }}
{{- $input := $spec.input | default dict }}
{{- $resource := $spec.resource | default dict }}
{{- $apUid := .observed.composite.resource.metadata.uid }}
{{- $projectName := "" }}
{{- if hasKey $spec "projectName" }}{{ $projectName = trim (toString $spec.projectName) }}{{ end }}
{{- $projectObs := getComposedResource . "project-observe" }}
{{- $projectUid := "" }}
{{- if and $projectObs $projectObs.status $projectObs.status.atProvider $projectObs.status.atProvider.manifest }}
{{- $m := $projectObs.status.atProvider.manifest }}
{{- $meta := index $m "metadata" }}
{{- if $meta }}
{{- $uidVal := index $meta "uid" }}
{{- if $uidVal }}{{ $projectUid = toString $uidVal }}{{ end }}
{{- end }}
{{- end }}
{{- $region := "" }}
{{- if and .observed.composite.resource.metadata.labels (index .observed.composite.resource.metadata.labels "region") }}
{{- $region = trim (toString (index .observed.composite.resource.metadata.labels "region")) }}
{{- end }}
{{- $slug := (sha256sum (printf "%s|%s|%s" $name $ns (default "" $apUid))) | trunc 6 }}
{{- $computedHost := "" }}
{{- if ne $region "" }}
{{- $computedHost = printf "%s-%s.%s" $name $slug $region }}
{{- end }}
{{- $host := "" }}
{{- if ne $region "" }}
{{- $host = $computedHost }}
{{- else }}
{{- if hasKey $input "host" }}{{ $host = trim (toString $input.host) }}{{ end }}
{{- if eq $host "" }}{{ $host = printf "%s.example.com" $name }}{{ end }}
{{- end }}"""

MINIO_EXTRA = """\
{{- $consoleHost := "" }}
{{- if ne $region "" }}
{{- $consoleHost = printf "%s-console-%s.%s" $name $slug $region }}
{{- else }}
{{- $consoleHost = $input.consoleHost | default (printf "%s-console.example.com" $name) }}
{{- end }}
{{- $apiHost := "" }}
{{- if ne $region "" }}
{{- $apiHost = printf "%s-api-%s.%s" $name $slug $region }}
{{- else }}
{{- $apiHost = $input.apiHost | default (printf "%s-api.example.com" $name) }}
{{- end }}"""

SEALOS_EXPR = re.compile(r"\$\{\{([^}]+)\}\}")
SEALOS_DOLLAR_BRACE = re.compile(r"\$\$\{([^}]+)\}")
SEALOS_IF = re.compile(r"\$\{\{\s*if\(([^)]+)\)\s*\}\}")
SEALOS_ENDIF = re.compile(r"\$\{\{\s*endif\s*\}\}")
DOC_SPLIT = re.compile(r"(?m)^---\s*$")


def snake_to_camel(snake_str: str) -> str:
    parts = snake_str.lower().split("_")
    return parts[0] + "".join(x.title() for x in parts[1:])


def sealos_dir_for(composite_stem: str, sealos_root: Path = SEALOS_ROOT) -> Path | None:
    folder = SEALOS_DIR_ALIASES.get(composite_stem, composite_stem)
    candidates = [
        sealos_root / folder,
        sealos_root / folder.replace("-", "_"),
    ]
    # case-insensitive match
    if not any(c.exists() for c in candidates):
        target = folder.lower()
        for p in sealos_root.iterdir():
            if p.is_dir() and p.name.lower() == target:
                return p
    for c in candidates:
        if c.exists():
            return c
    return None


def sealos_condition_to_go(cond: str) -> str:
    """Translate Sealos if() expressions to Go template condition fragments."""
    cond = cond.strip()

    def input_var(name: str) -> str:
        return f"${snake_to_camel(name)}"

    m = re.match(r"inputs\.(\w+)\s*===\s*'([^']*)'", cond)
    if m:
        return f'eq {input_var(m.group(1))} "{m.group(2)}"'

    m = re.match(r"inputs\.(\w+)\s*!==\s*''", cond)
    if m:
        v = input_var(m.group(1))
        return f'ne (trim (toString {v})) ""'

    m = re.match(r"^inputs\.(\w+)$", cond)
    if m:
        v = input_var(m.group(1))
        return f'ne (trim (toString {v})) ""'

    return cond


def convert_sealos_conditionals(text: str) -> str:
    text = SEALOS_ENDIF.sub("{{- end }}", text)

    def repl_if(m: re.Match[str]) -> str:
        raw = m.group(1)
        if "||" in raw:
            parts = [sealos_condition_to_go(p.strip()) for p in raw.split("||")]
            return "{{- if or " + " ".join(parts) + " }}"
        if "&&" in raw:
            parts = [sealos_condition_to_go(p.strip()) for p in raw.split("&&")]
            return "{{- if and " + " ".join(parts) + " }}"
        return "{{- if " + sealos_condition_to_go(raw) + " }}"

    return SEALOS_IF.sub(repl_if, text)


def convert_sealos_string(value: str, template_name: str) -> str:
    """Convert Sealos ${{ }} and $$ expressions in a string to Go template."""

    def repl_dollar_brace(m: re.Match[str]) -> str:
        inner = m.group(1)
        return f'{{{{ "${{{inner}}}" }}}}'

    value = SEALOS_DOLLAR_BRACE.sub(repl_dollar_brace, value)

    def repl_expr(m: re.Match[str]) -> str:
        expr = m.group(1).strip()
        if expr == "defaults.app_name":
            return "{{ $appName }}"
        if expr == "defaults.app_host":
            return "{{ $appHostSlug }}"
        if expr == "SEALOS_NAMESPACE":
            return "{{ $ns }}"
        if expr == "SEALOS_CLOUD_DOMAIN":
            return "{{ $region }}"
        if expr == "SEALOS_CERT_SECRET_NAME":
            return "wildcard-cert"
        if expr == "SEALOS_SERVICE_ACCOUNT":
            return "{{ $appName }}-sa"
        if expr.startswith("inputs."):
            camel = snake_to_camel(expr[7:])
            return f"{{{{ ${camel} }}}}"
        if expr.startswith("defaults."):
            key = expr[9:]
            if key in ("app_name", "app_host"):
                return "{{ $appName }}" if key == "app_name" else "{{ $appHostSlug }}"
            camel = snake_to_camel(key)
            return f"{{{{ ${camel} }}}}"
        if expr.startswith("random("):
            n = re.search(r"random\((\d+)\)", expr)
            length = n.group(1) if n else "8"
            return f'{{{{ randAlphaNum {length} }}}}'
        if expr.startswith("base64("):
            inner = expr[7:-1].strip()
            inner_conv = convert_sealos_string(f"${{{{ {inner} }}}}", template_name)
            # inner_conv already go; wrap b64enc
            inner_conv = inner_conv.replace("{{ ", "").replace(" }}", "")
            return f"{{{{ {inner_conv} | b64enc }}}}"
        return m.group(0)

    # Host + domain combined patterns (order matters)
    value = value.replace(
        "https://{{ $appHostSlug }}.{{ $region }}",
        "https://{{ $host }}",
    )
    value = value.replace(
        "http://{{ $appHostSlug }}.{{ $region }}",
        "http://{{ $host }}",
    )
    value = value.replace("{{ $appHostSlug }}.{{ $region }}", "{{ $host }}")

    value = SEALOS_EXPR.sub(repl_expr, value)
    # Normalize hosts after all substitutions
    value = value.replace(
        "https://{{ $appHostSlug }}.{{ $region }}", "https://{{ $host }}"
    )
    value = value.replace(
        "http://{{ $appHostSlug }}.{{ $region }}", "http://{{ $host }}"
    )
    value = value.replace("{{ $appHostSlug }}.{{ $region }}", "{{ $host }}")
    return value


def process_value(value: Any, template_name: str) -> Any:
    if isinstance(value, str):
        return convert_sealos_string(value, template_name)
    if isinstance(value, dict):
        return {k: process_value(v, template_name) for k, v in value.items()}
    if isinstance(value, list):
        return [process_value(v, template_name) for v in value]
    return value


def default_var_line(key: str, default_spec: dict[str, Any]) -> str:
    camel = snake_to_camel(key)
    raw = default_spec.get("value", "")
    if isinstance(raw, str) and "${{ random(" in raw:
        m = re.search(r"random\((\d+)\)", raw)
        n = m.group(1) if m else "8"
        prefix = ""
        if raw.startswith("sk-${{") or raw.startswith("sk-${{ "):
            prefix = "sk-"
        return (
            f'{{{{- ${camel} := $input.{camel} | default (printf "{prefix}%s" (randAlphaNum {n})) }}}}'
        )
    if isinstance(raw, str) and raw.strip() == "":
        return f'{{{{- ${camel} := $input.{camel} | default "" }}}}'
    if isinstance(raw, (int, float, bool)):
        return f"{{{{- ${camel} := $input.{camel} | default {json.dumps(raw)} }}}}"
    if isinstance(raw, str):
        escaped = raw.replace('"', '\\"')
        return f'{{{{- ${camel} := $input.{camel} | default "{escaped}" }}}}'
    return f'{{{{- ${camel} := $input.{camel} | default "" }}}}'


def input_var_line(key: str, input_spec: dict[str, Any]) -> str:
    camel = snake_to_camel(key)
    default = input_spec.get("default", "")
    if default is None:
        default = ""
    if isinstance(default, str):
        escaped = default.replace('"', '\\"')
        return f'{{{{- ${camel} := $input.{camel} | default "{escaped}" }}}}'
    return f'{{{{- ${camel} := $input.{camel} | default {json.dumps(default)} }}}}'


def build_param_lines(
    defaults: dict[str, Any], inputs: dict[str, Any]
) -> list[str]:
    lines: list[str] = []
    skip = {"app_name", "app_host"}
    for key, spec in defaults.items():
        if key in skip:
            continue
        camel = snake_to_camel(key)
        raw = spec.get("value", "")
        comment = ""
        if isinstance(raw, str) and "${{ random(" in raw:
            lines.append(f"    # {camel}: auto-generated if omitted")
            continue
        if isinstance(raw, str):
            lines.append(f'    {camel}: "{raw}"')
        else:
            lines.append(f"    {camel}: {json.dumps(raw)}")
    for key, spec in inputs.items():
        camel = snake_to_camel(key)
        desc = (spec.get("description") or "").replace("\n", " ")
        required = spec.get("required", False)
        default = spec.get("default", "")
        if isinstance(default, str):
            default_yaml = f'"{default}"'
        else:
            default_yaml = json.dumps(default)
        suffix = " (required)" if required else ""
        if desc:
            lines.append(f"    # {desc}{suffix}")
        lines.append(f"    {camel}: {default_yaml}")
    return lines


def build_template_instance(name: str, meta: dict[str, Any]) -> str:
    param_lines = build_param_lines(
        meta.get("defaults", {}), meta.get("inputs", {})
    )
    lines = [
        "apiVersion: example.crossplane.io/v1",
        "kind: AP",
        "metadata:",
        "  name: {{ name }}",
        "  labels:",
        "    region: {{ region }}",
        "spec:",
        "  crossplane:",
        "    compositionSelector:",
        "      matchLabels:",
        f"        template: {name}",
        f"  template: {name}",
        "  # projectName: my-project",
        "  name: {{ name }}",
        "  input:",
    ]
    if param_lines:
        lines.extend(param_lines)
    else:
        lines.append("    {}")
    lines.extend(
        [
            "  resource:",
            "    replicas: 1",
            "    requests:",
            '      cpu: "100m"',
            '      memory: "102Mi"',
            "    limits:",
            '      cpu: "1000m"',
            '      memory: "1024Mi"',
        ]
    )
    return "\n".join(lines)


def detect_kind(raw: str) -> str:
    m = re.search(r"^kind:\s*(\S+)", raw, re.MULTILINE)
    return m.group(1) if m else "Unknown"


def enhance_raw_resource(
    raw: str,
    resource_key: str,
    *,
    mark_ready: bool,
) -> str:
    text = raw.strip()
    kind = detect_kind(text)

    if re.search(r"^\s*namespace:", text, re.MULTILINE) is None:
        text = re.sub(
            r"(?m)^metadata:\s*$",
            "metadata:\n  namespace: {{ $ns }}",
            text,
            count=1,
        )

    ready_ann = (
        "\n    gotemplating.fn.crossplane.io/ready: \"True\"" if mark_ready else ""
    )
    if re.search(r"^\s*annotations:", text, re.MULTILINE):
        text = re.sub(
            r"(?m)^(\s*)annotations:\s*$",
            rf"\1annotations:\n\1  gotemplating.fn.crossplane.io/composition-resource-name: {resource_key}{ready_ann}",
            text,
            count=1,
        )
    else:
        text = re.sub(
            r"(?m)^metadata:\s*$",
            f"metadata:\n  annotations:\n    gotemplating.fn.crossplane.io/composition-resource-name: {resource_key}{ready_ann}",
            text,
            count=1,
        )

    if "cloud.sealos.io/deploy-on-sealos" not in text:
        if re.search(r"^\s*labels:", text, re.MULTILINE):
            text = re.sub(
                r"(?m)^(\s*)labels:\s*$",
                r"\1labels:\n\1  cloud.sealos.io/deploy-on-sealos: {{ $deployId }}",
                text,
                count=1,
            )
        else:
            text = re.sub(
                r"(?m)^metadata:\s*$",
                "metadata:\n  labels:\n    cloud.sealos.io/deploy-on-sealos: {{ $deployId }}",
                text,
                count=1,
            )

    if kind in WORKLOAD_KINDS | {"Ingress"}:
        text = add_project_labels_to_yaml(text, kind)
        if kind == "Ingress":
            text = text.replace(
                "cloud.sealos.io/app-deploy-manager-domain: {{ $appHostSlug }}",
                'cloud.sealos.io/app-deploy-manager-domain: {{ $host | replace "." "-" }}',
            )

    return text


def unquote_go_templates(yaml_text: str) -> str:
    """PyYAML quotes '{{ ... }}' values; Go templating needs them unquoted."""
    yaml_text = re.sub(r"'(\{\{[^'\n]+\}\})'", r"\1", yaml_text)
    yaml_text = re.sub(r'"(\{\{[^"\n]+\}\})"', r"\1", yaml_text)
    return yaml_text


def resource_to_yaml(resource: dict[str, Any]) -> str:
    return unquote_go_templates(
        yaml.dump(resource, default_flow_style=False, sort_keys=False).rstrip()
    )


def add_project_labels_to_yaml(yaml_text: str, kind: str) -> str:
    """Add project label conditionals after deploy-on-sealos label for workloads/ingress."""
    marker = "cloud.sealos.io/deploy-on-sealos: {{ $deployId }}"
    project_labels = """\
    {{ if ne $projectName "" }}
    crossplane.io/project-name: {{ $projectName | quote }}
    {{ end }}
    {{ if and (ne $projectName "") (ne $projectUid "") }}
    crossplane.io/project-uid: {{ $projectUid | quote }}
    {{ end }}"""
    if marker not in yaml_text or "crossplane.io/project-name" in yaml_text:
        return yaml_text
    return yaml_text.replace(marker, marker + "\n" + project_labels, 1)


def process_raw_document(
    raw: str, template_name: str, resource_key: str, *, mark_ready: bool
) -> str:
    text = convert_sealos_conditionals(raw)
    text = convert_sealos_string(text, template_name)
    return enhance_raw_resource(text, resource_key, mark_ready=mark_ready)


def strip_leading_document_separator(text: str) -> str:
    """Remove a leading --- so join_yaml_documents does not double-separate."""
    return re.sub(r"^---\s*\n", "", text.strip())


def join_yaml_documents(chunks: list[str]) -> str:
    """Join multi-document YAML chunks with a single --- between each."""
    docs = [
        strip_leading_document_separator(chunk)
        for chunk in chunks
        if chunk and chunk.strip()
    ]
    if not docs:
        return ""
    return "\n---\n".join(docs)


def generate_go_template(
    template_name: str,
    meta: dict[str, Any],
    raw_resources: list[str],
) -> str:
    parts: list[str] = [GO_HEADER.strip()]

    # appHostSlug for legacy sealos host slug (non-region)
    parts.append(
        '{{- $appHostSlug := "" }}'
        '\n{{- if hasKey $input "appHost" }}{{ $appHostSlug = trim (toString $input.appHost) }}{{ end }}'
        '\n{{- if eq $appHostSlug "" }}{{ $appHostSlug = $name }}{{ end }}'
    )

    if template_name == "minio":
        parts.append(MINIO_EXTRA.strip())

    for key, spec in meta.get("defaults", {}).items():
        if key in ("app_name", "app_host"):
            continue
        parts.append(default_var_line(key, spec))

    for key, spec in meta.get("inputs", {}).items():
        parts.append(input_var_line(key, spec))

    body: list[str] = []
    body.append(PROJECT_OBSERVE.strip())

    kind_counts: dict[str, int] = {}
    ready_marked = False
    for raw in raw_resources:
        kind = detect_kind(raw)
        kind_counts[kind] = kind_counts.get(kind, 0) + 1
        idx = kind_counts[kind]
        resource_key = f"{template_name}-{kind.lower()}"
        if kind_counts[kind] > 1:
            resource_key = f"{resource_key}-{idx}"

        mark_ready = not ready_marked and kind in WORKLOAD_KINDS
        if mark_ready:
            ready_marked = True

        body.append(
            process_raw_document(
                raw, template_name, resource_key, mark_ready=mark_ready
            )
        )

    body.append(COMPOSITION_FOOTER)

    header = "\n".join(parts)
    yaml_stream = join_yaml_documents(body)
    if yaml_stream:
        return f"{header}\n{yaml_stream}"
    return header


def indent_template(text: str, spaces: int = 12) -> str:
    prefix = " " * spaces
    return "\n".join(prefix + line if line else "" for line in text.splitlines())


def composition_metadata_name(template_name: str) -> str:
    """RFC 1123 subdomain for Composition metadata.name."""
    return template_name.lower()


def write_composition_file(
    path: Path, template_name: str, meta: dict[str, Any], go_template: str
) -> None:
    """Write composition YAML with literal block scalars for multiline templates."""
    instance = build_template_instance(template_name, meta)
    indented_tpl = indent_template(go_template)

    lines = [
        "apiVersion: apiextensions.crossplane.io/v1",
        "kind: Composition",
        "metadata:",
        f"  name: aps-{composition_metadata_name(template_name)}-go-templating",
        "  labels:",
        f"    template: {template_name}",
        "  annotations:",
        "    meta.crossplane.io/type: template",
        f"    meta.crossplane.io/display-name: {yaml_quote(meta.get('title', template_name))}",
        f"    meta.crossplane.io/icon-url: {yaml_quote(meta.get('icon', ''))}",
        f"    meta.crossplane.io/description: {yaml_quote(meta.get('description', ''))}",
    ]
    if meta.get("readme"):
        lines.append(
            f"    meta.crossplane.io/readme: {yaml_quote(meta['readme'])}"
        )
    url = meta.get("url") or meta.get("gitRepo") or ""
    if url:
        lines.append(f"    meta.crossplane.io/url: {yaml_quote(url)}")
    if meta.get("author"):
        lines.append(f"    meta.crossplane.io/author: {yaml_quote(meta['author'])}")
    lines.append("    template/instance: |")
    for ln in instance.splitlines():
        lines.append(f"      {ln}")
    lines.extend(
        [
            "spec:",
            "  compositeTypeRef:",
            "    apiVersion: example.crossplane.io/v1",
            "    kind: AP",
            "  mode: Pipeline",
            "  pipeline:",
            f"    - step: render-{template_name}",
            "      functionRef:",
            "        name: crossplane-contrib-function-go-templating",
            "      input:",
            "        apiVersion: gotemplating.fn.crossplane.io/v1beta1",
            "        kind: GoTemplate",
            "        source: Inline",
            "        inline:",
            "          template: |",
        ]
    )
    lines.extend(indented_tpl.splitlines())
    path.write_text("\n".join(lines) + "\n")


def yaml_quote(value: str) -> str:
    if not value:
        return '""'
    if re.search(r'[:#\n"\'{}]', value):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value


def load_sealos_template(path: Path) -> tuple[dict[str, Any], list[str]]:
    content = path.read_text()
    parts = [p.strip() for p in DOC_SPLIT.split(content) if p.strip()]
    if not parts:
        raise ValueError(f"Empty template: {path}")

    template_cr = yaml.safe_load(parts[0])
    if not template_cr or template_cr.get("kind") != "Template":
        raise ValueError(f"No Template CR in {path}")

    spec = template_cr.get("spec", {})
    meta = {
        "name": template_cr.get("metadata", {}).get("name", path.parent.name),
        "title": spec.get("title", ""),
        "icon": spec.get("icon", ""),
        "description": spec.get("description", ""),
        "readme": spec.get("readme", ""),
        "gitRepo": spec.get("gitRepo", ""),
        "url": spec.get("url", ""),
        "author": spec.get("author", "Sealos"),
        "defaults": spec.get("defaults", {}) or {},
        "inputs": spec.get("inputs", {}) or {},
    }
    raw_resources = parts[1:]
    return meta, raw_resources


def sync_composite(
    composite_path: Path, *, dry_run: bool = False, sealos_root: Path = SEALOS_ROOT
) -> str:
    stem = composite_path.stem.replace("-composite", "")
    sealos_dir = sealos_dir_for(stem, sealos_root)
    if sealos_dir is None:
        return "skip:no-sealos-source"

    index = sealos_dir / "index.yaml"
    if not index.exists():
        return "skip:no-index"

    meta, raw_resources = load_sealos_template(index)
    template_name = meta["name"]
    go_tpl = generate_go_template(template_name, meta, raw_resources)

    if dry_run:
        return f"ok:dry-run:{len(raw_resources)}resources"

    write_composition_file(composite_path, template_name, meta, go_tpl)
    return f"ok:{len(raw_resources)}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync composites from Sealos templates")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", nargs="*", help="Composite stems to sync (e.g. agora dify)")
    parser.add_argument("--sealos-root", type=Path, default=SEALOS_ROOT)
    args = parser.parse_args()

    composites = sorted(TEMPLATES_DIR.glob("*-composite.yaml"))
    if args.only:
        only = {x.replace("-composite", "") for x in args.only}
        composites = [p for p in composites if p.stem.replace("-composite", "") in only]

    stats: dict[str, int] = {}
    for path in composites:
        try:
            result = sync_composite(
                path, dry_run=args.dry_run, sealos_root=args.sealos_root
            )
        except Exception as exc:  # noqa: BLE001 — batch sync reports per-file errors
            result = f"error:{exc}"
        key = result.split(":")[0]
        stats[key] = stats.get(key, 0) + 1
        if args.only or not result.startswith("ok:"):
            print(f"{path.name}: {result}")

    print("\nSummary:", stats, file=sys.stderr)


if __name__ == "__main__":
    main()
