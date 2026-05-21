package ap

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// APCompositeLabel is the label key used to find ingresses for an AP (Application) instance.
const APCompositeLabel = "crossplane.io/composite"

// defaultIngressHostFromComposition is used when AP spec has no endpoints (see hub
// aps-deployment-ingress-go-templating). It must not surface as a real connection URL.
const defaultIngressHostFromComposition = "placeholder.example.com"

func isPlaceholderIngressHost(host string) bool {
	h := strings.TrimSpace(strings.ToLower(host))
	if h == defaultIngressHostFromComposition {
		return true
	}
	suffix := "." + defaultIngressHostFromComposition
	return strings.HasSuffix(h, suffix)
}

// connectionVariablesEndpoints keeps endpoints only when at least one external URL exists.
// Otherwise the UI would show internal-only rows (e.g. port 8000 cluster DNS) when there is no
// real ingress endpoint for the app.
func connectionVariablesEndpoints(endpoints []map[string]interface{}) []map[string]interface{} {
	for _, ep := range endpoints {
		if typ, _ := ep["type"].(string); typ == "external" {
			return endpoints
		}
	}
	return nil
}

// APWithIngressesServicesAndBackups extends APWithIngressesAndServicesFromList with status.backups (snapshot summaries).
func APWithIngressesServicesAndBackups(ap map[string]interface{}, ingresses, services []map[string]interface{}, backups []map[string]interface{}) map[string]interface{} {
	out := APWithIngressesAndServicesFromList(ap, ingresses, services)
	if out == nil || len(backups) == 0 {
		return out
	}
	status, _ := out["status"].(map[string]interface{})
	if status != nil {
		status["backups"] = backups
	}
	return out
}

// APWithIngressesAndServicesFromList takes an AP resource (as raw map), lists of ingresses and services,
// and appends status.variables derived from observed ingresses/services (internal/external URLs per port).
// Cluster-written status (e.g. status.endpoints from composition) is preserved; only variables is set by this transform.
func APWithIngressesAndServicesFromList(ap map[string]interface{}, ingresses, services []map[string]interface{}) map[string]interface{} {
	if ap == nil {
		return nil
	}
	// Shallow copy to avoid mutating the original
	out := make(map[string]interface{})
	for k, v := range ap {
		out[k] = v
	}

	// Ensure status exists and copy it to avoid mutating the original
	status, _ := out["status"].(map[string]interface{})
	if status == nil {
		status = make(map[string]interface{})
	}
	statusCopy := make(map[string]interface{})
	for k, v := range status {
		statusCopy[k] = v
	}
	endpoints := buildEndpoints(ap, ingresses, services)
	if len(endpoints) == 0 {
		endpoints = buildEndpointsFromSpec(ap, ingresses, services)
	}
	statusCopy["variables"] = buildVariablesFromEndpoints(endpoints)
	mergePrivateNetworkStatus(ap, statusCopy, services)
	out["status"] = statusCopy

	return out
}

func mergePrivateNetworkStatus(ap map[string]interface{}, status map[string]interface{}, services []map[string]interface{}) {
	privatePort, ok := apPrivatePort(ap)
	if !ok {
		return
	}

	network, _ := status["network"].(map[string]interface{})
	networkCopy := make(map[string]interface{})
	for k, v := range network {
		networkCopy[k] = v
	}
	if _, exists := networkCopy["privatePort"]; !exists {
		networkCopy["privatePort"] = privatePort
	}
	if _, exists := networkCopy["privateAddress"]; !exists {
		apNamespace := getString(ap, "metadata", "namespace")
		if addr := privateNetworkAddressForPort(services, apNamespace, privatePort); addr != "" {
			networkCopy["privateAddress"] = addr
		}
	}
	status["network"] = networkCopy
}

func apPrivatePort(ap map[string]interface{}) (int, bool) {
	spec, _ := ap["spec"].(map[string]interface{})
	if spec == nil {
		return 0, false
	}
	input, _ := spec["input"].(map[string]interface{})
	if input == nil {
		return 0, false
	}
	network, _ := input["network"].(map[string]interface{})
	if network == nil {
		return 0, false
	}
	return privatePortFromValue(network["privatePort"])
}

func privateNetworkAddressForPort(services []map[string]interface{}, namespace string, privatePort int) string {
	for _, svc := range services {
		svcName := getString(svc, "metadata", "name")
		if svcName == "" {
			continue
		}
		svcNamespace := getString(svc, "metadata", "namespace")
		if svcNamespace == "" {
			svcNamespace = namespace
		}
		if svcNamespace == "" {
			continue
		}
		for _, port := range getPorts(svc) {
			if port != privatePort {
				continue
			}
			if privatePort == 80 {
				return fmt.Sprintf("http://%s.%s.svc.cluster.local", svcName, svcNamespace)
			}
			return fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", svcName, svcNamespace, privatePort)
		}
	}
	return ""
}

func privatePortFromValue(value interface{}) (int, bool) {
	var port int
	switch v := value.(type) {
	case float64:
		if v != math.Trunc(v) || v < 1 || v > 65535 {
			return 0, false
		}
		port = int(v)
	case int:
		port = v
	case int64:
		port = int(v)
	case int32:
		port = int(v)
	case string:
		p, err := strconv.Atoi(v)
		if err != nil {
			return 0, false
		}
		port = p
	default:
		return 0, false
	}
	if port < 1 || port > 65535 {
		return 0, false
	}
	return port, true
}

// buildEndpoints composes internal and external addresses for each service port.
// Endpoint names: "port-{port}-internal", "port-{port}-external"
func buildEndpoints(ap map[string]interface{}, ingresses, services []map[string]interface{}) []map[string]interface{} {
	apNamespace := getString(ap, "metadata", "namespace")
	if apNamespace == "" && len(services) > 0 {
		apNamespace = getString(services[0], "metadata", "namespace")
	}
	if apNamespace == "" && len(ingresses) > 0 {
		apNamespace = getString(ingresses[0], "metadata", "namespace")
	}
	if apNamespace == "" {
		return nil
	}
	externalBySvcPort := buildExternalAddressMap(ingresses, apNamespace)

	var endpoints []map[string]interface{}
	seen := make(map[string]bool)
	for _, svc := range services {
		svcName := getString(svc, "metadata", "name")
		svcNamespace := getString(svc, "metadata", "namespace")
		if svcNamespace == "" {
			svcNamespace = apNamespace
		}
		ports := getPorts(svc)
		for _, port := range ports {
			internalName := "port-" + strconv.Itoa(port) + "-internal"
			if !seen[internalName] {
				seen[internalName] = true
				internalAddr := fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", svcName, svcNamespace, port)
				endpoints = append(endpoints, map[string]interface{}{
					"name":    internalName,
					"address": internalAddr,
					"type":    "internal",
					"port":    port,
				})
			}

			extKey := svcName + ":" + strconv.Itoa(port)
			if extAddr, ok := externalBySvcPort[extKey]; ok {
				externalName := "port-" + strconv.Itoa(port) + "-external"
				if !seen[externalName] {
					seen[externalName] = true
					endpoints = append(endpoints, map[string]interface{}{
						"name":    externalName,
						"address": extAddr,
						"type":    "external",
						"port":    port,
					})
				}
			}
		}
	}
	return endpoints
}

// buildEndpointsFromSpec builds endpoints from AP spec.endpoints when buildEndpoints returns empty.
// Uses spec.endpoints (host, port) for external URLs and status.services for internal URLs.
func buildEndpointsFromSpec(ap map[string]interface{}, ingresses, services []map[string]interface{}) []map[string]interface{} {
	spec, _ := ap["spec"].(map[string]interface{})
	if spec == nil {
		return nil
	}
	rawEndpoints, _ := spec["endpoints"].([]interface{})
	if len(rawEndpoints) == 0 {
		return nil
	}
	apNamespace := getString(ap, "metadata", "namespace")
	if apNamespace == "" && len(services) > 0 {
		apNamespace = getString(services[0], "metadata", "namespace")
	}
	if apNamespace == "" && len(ingresses) > 0 {
		apNamespace = getString(ingresses[0], "metadata", "namespace")
	}
	tlsHosts := make(map[string]bool)
	for _, ing := range ingresses {
		if spec, _ := ing["spec"].(map[string]interface{}); spec != nil {
			for h := range getTLSHosts(spec) {
				tlsHosts[h] = true
			}
		}
	}
	svcByPort := make(map[int]string)
	for _, svc := range services {
		svcName := getString(svc, "metadata", "name")
		svcNs := getString(svc, "metadata", "namespace")
		if svcNs == "" {
			svcNs = apNamespace
		}
		for _, port := range getPorts(svc) {
			svcByPort[port] = fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", svcName, svcNs, port)
		}
	}
	seen := make(map[string]bool)
	var endpoints []map[string]interface{}
	for _, ep := range rawEndpoints {
		epMap, _ := ep.(map[string]interface{})
		if epMap == nil {
			continue
		}
		host, _ := epMap["host"].(string)
		if host == "" || isPlaceholderIngressHost(host) {
			continue
		}
		var port int
		switch v := epMap["port"].(type) {
		case float64:
			port = int(v)
		case int:
			port = v
		case int64:
			port = int(v)
		case int32:
			port = int(v)
		case string:
			if p, err := strconv.Atoi(v); err == nil {
				port = p
			}
		}
		if port == 0 {
			continue
		}
		scheme := "http"
		if tlsHosts[host] {
			scheme = "https"
		}
		externalName := "port-" + strconv.Itoa(port) + "-external"
		if !seen[externalName] {
			seen[externalName] = true
			endpoints = append(endpoints, map[string]interface{}{
				"name":    externalName,
				"address": fmt.Sprintf("%s://%s/", scheme, host),
				"type":    "external",
				"port":    port,
			})
		}
		internalName := "port-" + strconv.Itoa(port) + "-internal"
		if !seen[internalName] {
			if internalAddr, ok := svcByPort[port]; ok {
				seen[internalName] = true
				endpoints = append(endpoints, map[string]interface{}{
					"name":    internalName,
					"address": internalAddr,
					"type":    "internal",
					"port":    port,
				})
			}
		}
	}
	return endpoints
}

// buildVariablesFromEndpoints converts endpoints to variables for the variable table.
// Each endpoint becomes { name, value } with the address as the value.
func buildVariablesFromEndpoints(endpoints []map[string]interface{}) []map[string]interface{} {
	if len(endpoints) == 0 {
		return nil
	}
	vars := make([]map[string]interface{}, 0, len(endpoints))
	for _, ep := range endpoints {
		name, _ := ep["name"].(string)
		addr, _ := ep["address"].(string)
		if name != "" && addr != "" {
			vars = append(vars, map[string]interface{}{
				"name":  name,
				"value": addr,
			})
		}
	}
	return vars
}

func getString(obj map[string]interface{}, keys ...string) string {
	for i, k := range keys {
		if obj == nil {
			return ""
		}
		v, _ := obj[k]
		if i == len(keys)-1 {
			if s, ok := v.(string); ok {
				return s
			}
			return ""
		}
		obj, _ = v.(map[string]interface{})
	}
	return ""
}

func getPorts(svc map[string]interface{}) []int {
	spec, _ := svc["spec"].(map[string]interface{})
	if spec == nil {
		return nil
	}
	rawPorts, _ := spec["ports"].([]interface{})
	if rawPorts == nil {
		return nil
	}
	var ports []int
	for _, p := range rawPorts {
		portMap, _ := p.(map[string]interface{})
		if portMap == nil {
			continue
		}
		switch v := portMap["port"].(type) {
		case float64:
			ports = append(ports, int(v))
		case int:
			ports = append(ports, v)
		case int64:
			ports = append(ports, int(v))
		case int32:
			ports = append(ports, int(v))
		case string:
			if p, err := strconv.Atoi(v); err == nil {
				ports = append(ports, p)
			}
		}
	}
	return ports
}

func buildExternalAddressMap(ingresses []map[string]interface{}, namespace string) map[string]string {
	result := make(map[string]string)
	for _, ing := range ingresses {
		ingNamespace := getString(ing, "metadata", "namespace")
		if ingNamespace == "" {
			ingNamespace = namespace
		}
		lbHost := getLoadBalancerHost(ing)
		spec, _ := ing["spec"].(map[string]interface{})
		if spec == nil {
			continue
		}
		tlsHosts := getTLSHosts(spec)
		rules, _ := spec["rules"].([]interface{})
		if rules == nil {
			continue
		}
		for _, r := range rules {
			rule, _ := r.(map[string]interface{})
			if rule == nil {
				continue
			}
			host, _ := rule["host"].(string)
			if host == "" {
				host = lbHost
			}
			if host == "" || isPlaceholderIngressHost(host) {
				continue
			}
			httpRule, _ := rule["http"].(map[string]interface{})
			if httpRule == nil {
				continue
			}
			paths, _ := httpRule["paths"].([]interface{})
			if paths == nil {
				continue
			}
			scheme := "http"
			if tlsHosts[host] {
				scheme = "https"
			}
			for _, p := range paths {
				pathObj, _ := p.(map[string]interface{})
				if pathObj == nil {
					continue
				}
				path, _ := pathObj["path"].(string)
				if path == "" {
					path = "/"
				}
				if path[0] != '/' {
					path = "/" + path
				}
				backend, _ := pathObj["backend"].(map[string]interface{})
				if backend == nil {
					continue
				}
				svcRef, _ := backend["service"].(map[string]interface{})
				if svcRef == nil {
					continue
				}
				svcName, _ := svcRef["name"].(string)
				if svcName == "" {
					continue
				}
				var port int
				if portObj, ok := svcRef["port"].(map[string]interface{}); ok {
					switch v := portObj["number"].(type) {
					case float64:
						port = int(v)
					case int:
						port = v
					case int64:
						port = int(v)
					case int32:
						port = int(v)
					case string:
						if p, err := strconv.Atoi(v); err == nil {
							port = p
						}
					}
				}
				if port == 0 {
					continue
				}
				addr := fmt.Sprintf("%s://%s%s", scheme, host, path)
				key := svcName + ":" + strconv.Itoa(port)
				if _, exists := result[key]; !exists {
					result[key] = addr
				}
			}
		}
	}
	return result
}

func getLoadBalancerHost(ing map[string]interface{}) string {
	status, _ := ing["status"].(map[string]interface{})
	if status == nil {
		return ""
	}
	lb, _ := status["loadBalancer"].(map[string]interface{})
	if lb == nil {
		return ""
	}
	ingresses, _ := lb["ingress"].([]interface{})
	if len(ingresses) == 0 {
		return ""
	}
	first, _ := ingresses[0].(map[string]interface{})
	if first == nil {
		return ""
	}
	if h, ok := first["hostname"].(string); ok && h != "" {
		return h
	}
	if ip, ok := first["ip"].(string); ok && ip != "" {
		return ip
	}
	return ""
}

func getTLSHosts(spec map[string]interface{}) map[string]bool {
	hosts := make(map[string]bool)
	tls, _ := spec["tls"].([]interface{})
	if tls == nil {
		return hosts
	}
	for _, t := range tls {
		tlsMap, _ := t.(map[string]interface{})
		if tlsMap == nil {
			continue
		}
		rawHosts, _ := tlsMap["hosts"].([]interface{})
		for _, h := range rawHosts {
			if s, ok := h.(string); ok {
				hosts[s] = true
			}
		}
	}
	return hosts
}
