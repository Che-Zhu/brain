#!/usr/bin/env python3
"""
Convert a single Sealos Template index.yaml to a Crossplane Composition.

Prefer batch sync (region, projectName, inputs) via:

    python3 sync-sealos-templates.py --only <template-name>

Usage:
    python3 convert-sealos-to-crossplane.py <index.yaml> -o <composite.yaml>

For a full refresh from ~/Downloads/templates/template:

    python3 sync-sealos-templates.py
"""

import yaml
import sys
import re
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional


def convert_sealos_variable(var: str) -> str:
    """
    Convert Sealos template variables to Go template syntax.

    Examples:
        ${{ defaults.app_name }} -> {{ $name }}-{{ $suffix }}
        ${{ defaults.app_host }} -> {{ $host }}
        ${{ inputs.PARAM_NAME }} -> {{ $spec.paramName }}
        ${{ SEALOS_NAMESPACE }} -> {{ $ns }}
        ${{ random(8) }} -> {{ $suffix }}
    """
    var = var.strip()

    # Remove ${{ and }}
    if var.startswith('${{') and var.endswith('}}'):
        inner = var[3:-2].strip()
    else:
        return var

    # Handle specific patterns
    if inner == 'defaults.app_name':
        return '{{ $name }}-{{ $suffix }}'
    elif inner == 'defaults.app_host':
        return '{{ $host | replace "." "-" }}'
    elif inner == 'SEALOS_NAMESPACE':
        return '{{ $ns }}'
    elif inner == 'SEALOS_CLOUD_DOMAIN':
        return 'example.com'  # Part of $host
    elif inner == 'SEALOS_CERT_SECRET_NAME':
        return 'wildcard-cert'
    elif inner == 'SEALOS_SERVICE_ACCOUNT':
        return '{{ $serviceAccount }}'
    elif inner.startswith('random('):
        return '{{ $suffix }}'
    elif inner.startswith('base64('):
        # Extract the inner expression and convert recursively
        inner_expr = inner[7:-1]  # Remove base64( and )
        converted = convert_sealos_variable(inner_expr)
        return f'{{{{ {converted} | b64enc }}}}'
    elif inner.startswith('inputs.'):
        param_name = inner[7:]  # Remove 'inputs.'
        # Convert UPPER_CASE to camelCase
        camel = snake_to_camel(param_name)
        return f'{{{{ $spec.{camel} }}}}'
    elif inner.startswith('defaults.'):
        param_name = inner[9:]  # Remove 'defaults.'
        if param_name == 'app_name':
            return '{{ $name }}-{{ $suffix }}'
        elif param_name == 'app_host':
            return '{{ $host | replace "." "-" }}'
        else:
            # Custom default, convert to camelCase and reference from spec
            camel = snake_to_camel(param_name)
            return f'{{{{ $spec.{camel} }}}}'
    else:
        return f'{{{{ ${inner} }}}}'


def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case or UPPER_CASE to camelCase."""
    components = snake_str.lower().split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def process_yaml_value(value):
    """Recursively process YAML values to convert Sealos variables."""
    if isinstance(value, str):
        # Find all ${{ ... }} patterns and convert them
        pattern = r'\$\{\{[^}]+\}\}'
        matches = re.findall(pattern, value)
        for match in matches:
            converted = convert_sealos_variable(match)
            value = value.replace(match, converted)
        return value
    elif isinstance(value, dict):
        return {k: process_yaml_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [process_yaml_value(item) for item in value]
    else:
        return value


def extract_template_metadata(template: Dict[str, Any]) -> Dict[str, Any]:
    """Extract metadata from Sealos Template CR."""
    spec = template.get('spec', {})
    name = template.get('metadata', {}).get('name', 'unknown')

    return {
        'name': name,
        'title': spec.get('title', name),
        'icon': spec.get('icon', ''),
        'description': spec.get('description', ''),
        'gitRepo': spec.get('gitRepo', ''),
        'defaults': spec.get('defaults', {}),
        'inputs': spec.get('inputs', {}),
    }


def extract_k8s_resources(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract Kubernetes resources (non-Template) from YAML docs."""
    resources = []
    for doc in docs:
        if doc is None:
            continue
        kind = doc.get('kind')
        api_version = doc.get('apiVersion')

        # Skip Template CR
        if kind == 'Template' and api_version == 'app.sealos.io/v1':
            continue

        resources.append(doc)

    return resources


def generate_composition(
    template_meta: Dict[str, Any],
    resources: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generate Crossplane Composition from template metadata and resources."""

    name = template_meta['name']

    # Generate Go template header with variable setup
    template_header = f"""
{{{{- $name := .observed.composite.resource.spec.name | default .observed.composite.resource.metadata.name }}}}
{{{{- $uid := printf "%s" (index .observed.composite.resource.metadata "uid" | default "") -}}}}
{{{{- $suffix := (replace "-" "" $uid | trunc 4) | default (sha256sum (printf "%s-%s" .observed.composite.resource.metadata.namespace .observed.composite.resource.metadata.name) | trunc 4) }}}}
{{{{- $deployId := printf "%s-%s" $name $suffix }}}}
{{{{- $ns := .observed.composite.resource.metadata.namespace }}}}
{{{{- $spec := .observed.composite.resource.spec }}}}
{{{{- $apUid := .observed.composite.resource.metadata.uid }}}}
{{{{- $projectName := "" }}}}
{{{{- if hasKey $spec "projectName" }}}}{{{{ $projectName = trim (toString $spec.projectName) }}}}{{{{ end }}}}
{{{{- $projectObs := getComposedResource . "project-observe" }}}}
{{{{- $projectUid := "" }}}}
{{{{- if and $projectObs $projectObs.status $projectObs.status.atProvider $projectObs.status.atProvider.manifest }}}}
{{{{- $m := $projectObs.status.atProvider.manifest }}}}
{{{{- $meta := index $m "metadata" }}}}
{{{{- if $meta }}}}
{{{{- $uidVal := index $meta "uid" }}}}
{{{{- if $uidVal }}}}{{{{ $projectUid = toString $uidVal }}}}{{{{ end }}}}
{{{{- end }}}}
{{{{- end }}}}
{{{{- $region := "" }}}}
{{{{- if and .observed.composite.resource.metadata.labels (index .observed.composite.resource.metadata.labels "region") }}}}
{{{{- $region = trim (toString (index .observed.composite.resource.metadata.labels "region")) }}}}
{{{{- end }}}}
{{{{- $slug := (sha256sum (printf "%s|%s|%s" $name $ns (default "" $apUid))) | trunc 6 }}}}
{{{{- $computedHost := "" }}}}
{{{{- if ne $region "" }}}}
{{{{- $computedHost = printf "%s-%s.%s" $name $slug $region }}}}
{{{{- end }}}}
{{{{- $host := "" }}}}
{{{{- if ne $region "" }}}}
{{{{- $host = $computedHost }}}}
{{{{- else }}}}
{{{{- if hasKey $spec "host" }}}}{{{{ $host = trim (toString $spec.host) }}}}{{{{ end }}}}
{{{{- if eq $host "" }}}}{{{{ $host = printf "%s.example.com" $name }}}}{{{{ end }}}}
{{{{- end }}}}
{{{{- $serviceAccount := printf "%s-sa" $name }}}}
""".strip()

    # Add variable declarations for inputs
    for input_name in template_meta['inputs'].keys():
        camel_name = snake_to_camel(input_name)
        default_value = template_meta['inputs'][input_name].get('default', '""')
        if isinstance(default_value, str):
            default_value = f'"{default_value}"'
        template_header += f'\n{{{{- ${camel_name} := $spec.{camel_name} | default {default_value} }}}}'

    # Convert resources to YAML string with variable substitution
    resources_yaml = []
    for i, resource in enumerate(resources):
        # Process the resource to convert Sealos variables
        processed = process_yaml_value(resource)

        # Add required annotations and labels
        if 'metadata' not in processed:
            processed['metadata'] = {}
        if 'annotations' not in processed['metadata']:
            processed['metadata']['annotations'] = {}
        if 'labels' not in processed['metadata']:
            processed['metadata']['labels'] = {}

        # Determine resource name for annotation
        kind = processed.get('kind', 'unknown').lower()
        resource_name = f"{name}-{kind}"
        if i > 0 and processed.get('kind') == resources[i-1].get('kind'):
            resource_name = f"{resource_name}-{i}"

        processed['metadata']['annotations']['gotemplating.fn.crossplane.io/composition-resource-name'] = resource_name

        # Mark first workload as ready
        if i == 0 and processed.get('kind') in ['Deployment', 'StatefulSet', 'DaemonSet']:
            processed['metadata']['annotations']['gotemplating.fn.crossplane.io/ready'] = '"True"'

        # Add deploy-on-sealos labels
        processed['metadata']['labels']['cloud.sealos.io/deploy-on-sealos'] = '{{ $deployId }}'

        # Convert to YAML
        resource_yaml = yaml.dump(processed, default_flow_style=False, sort_keys=False)
        resources_yaml.append(resource_yaml)

    # Add status update resource
    status_resource = f"""---
apiVersion: example.crossplane.io/v1
kind: AP
metadata:
  name: {{{{ .observed.composite.resource.metadata.name }}}}
  namespace: {{{{ $ns }}}}
status:
  phase: Ready
"""

    # Combine template header, resources, and status
    go_template = template_header + "\n\n" + "---\n".join(resources_yaml) + "\n" + status_resource

    # Create Composition
    composition = {
        'apiVersion': 'apiextensions.crossplane.io/v1',
        'kind': 'Composition',
        'metadata': {
            'name': f'aps-{name.lower()}-go-templating',
            'labels': {
                'template': name
            },
            'annotations': {
                'meta.crossplane.io/display-name': template_meta['title'],
                'meta.crossplane.io/icon-url': template_meta['icon'],
                'meta.crossplane.io/description': template_meta['description']
            }
        },
        'spec': {
            'compositeTypeRef': {
                'apiVersion': 'example.crossplane.io/v1',
                'kind': 'AP'
            },
            'mode': 'Pipeline',
            'pipeline': [
                {
                    'step': f'render-{name}',
                    'functionRef': {
                        'name': 'crossplane-contrib-function-go-templating'
                    },
                    'input': {
                        'apiVersion': 'gotemplating.fn.crossplane.io/v1beta1',
                        'kind': 'GoTemplate',
                        'source': 'Inline',
                        'inline': {
                            'template': go_template
                        }
                    }
                }
            ]
        }
    }

    return composition


def main():
    parser = argparse.ArgumentParser(description='Convert Sealos Template to Crossplane Composition')
    parser.add_argument('template_file', help='Path to Sealos template YAML file')
    parser.add_argument('--output', '-o', help='Output file (default: stdout)')

    args = parser.parse_args()

    # Read template file
    template_path = Path(args.template_file)
    if not template_path.exists():
        print(f"Error: File not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    with open(template_path, 'r') as f:
        # Load all YAML documents
        docs = list(yaml.safe_load_all(f))

    # Extract Template CR metadata
    template_cr = next((d for d in docs if d and d.get('kind') == 'Template'), None)
    if not template_cr:
        print("Error: No Template CR found in file", file=sys.stderr)
        sys.exit(1)

    template_meta = extract_template_metadata(template_cr)

    # Extract Kubernetes resources
    k8s_resources = extract_k8s_resources(docs)

    if not k8s_resources:
        print("Warning: No Kubernetes resources found", file=sys.stderr)

    # Generate Composition
    composition = generate_composition(template_meta, k8s_resources)

    # Output
    output_yaml = yaml.dump(composition, default_flow_style=False, sort_keys=False)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(output_yaml)
        print(f"Composition written to {args.output}", file=sys.stderr)
    else:
        print(output_yaml)


if __name__ == '__main__':
    main()
