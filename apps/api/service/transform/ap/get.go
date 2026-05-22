package ap

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// APCompositeLabel is the label key used to find ingresses for an AP (Application) instance.
const APCompositeLabel = "crossplane.io/composite"

// defaultIngressHostFromComposition is a placeholder from older generated templates.
// It must not surface as a real connection URL.
const defaultIngressHostFromComposition = "placeholder.example.com"

func isPlaceholderIngressHost(host string) bool {
	h := strings.TrimSpace(strings.ToLower(host))
	if h == defaultIngressHostFromComposition {
		return true
	}
	suffix := "." + defaultIngressHostFromComposition
	return strings.HasSuffix(h, suffix)
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
// and enriches status.network from spec.input.network when the cluster has not written it yet.
// It keeps the older status.variables table populated from observed Service/Ingress state only.
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
	connectionRows := buildConnectionRows(ap, ingresses, services)
	if variables := buildVariablesFromConnectionRows(connectionRows); len(variables) > 0 {
		statusCopy["variables"] = variables
	} else {
		delete(statusCopy, "variables")
	}
	mergePrivateNetworkStatus(ap, statusCopy, services)
	mergePublicNetworkStatus(ap, statusCopy, ingresses)
	out["status"] = statusCopy

	return out
}

func mergePrivateNetworkStatus(ap map[string]interface{}, status map[string]interface{}, services []map[string]interface{}) {
	privatePort, ok := apPrivatePort(ap)
	if !ok {
		return
	}

	networkCopy := networkStatusCopy(status)
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

func networkStatusCopy(status map[string]interface{}) map[string]interface{} {
	network, _ := status["network"].(map[string]interface{})
	networkCopy := make(map[string]interface{}, len(network)+1)
	for k, v := range network {
		networkCopy[k] = v
	}
	return networkCopy
}

func apInputNetwork(ap map[string]interface{}) map[string]interface{} {
	spec, _ := ap["spec"].(map[string]interface{})
	input, _ := spec["input"].(map[string]interface{})
	network, _ := input["network"].(map[string]interface{})
	return network
}

func apPrivatePort(ap map[string]interface{}) (int, bool) {
	network := apInputNetwork(ap)
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

type networkPublicAddress struct {
	host string
	port int
}

func mergePublicNetworkStatus(ap map[string]interface{}, status map[string]interface{}, ingresses []map[string]interface{}) {
	addresses := apPublicAddresses(ap)
	if len(addresses) == 0 {
		return
	}
	networkCopy := networkStatusCopy(status)
	if _, exists := networkCopy["publicAddresses"]; exists {
		status["network"] = networkCopy
		return
	}

	schemeByHost := ingressSchemeByHost(ingresses)
	accessStatus := publicAccessStatusFromPhase(status["phase"])
	publicAddresses := make([]map[string]interface{}, 0, len(addresses))
	for _, address := range addresses {
		scheme := schemeByHost[address.host]
		if scheme == "" {
			scheme = "http"
		}
		publicAddresses = append(publicAddresses, map[string]interface{}{
			"host":   address.host,
			"port":   address.port,
			"status": accessStatus,
			"type":   "platform",
			"url":    fmt.Sprintf("%s://%s/", scheme, address.host),
		})
	}
	networkCopy["publicAddresses"] = publicAddresses
	status["network"] = networkCopy
}

func apPublicAddresses(ap map[string]interface{}) []networkPublicAddress {
	network := apInputNetwork(ap)
	if network == nil {
		return nil
	}
	raw, _ := network["publicAddresses"].([]interface{})
	if len(raw) == 0 {
		return nil
	}
	addresses := make([]networkPublicAddress, 0, len(raw))
	for _, item := range raw {
		address, _ := item.(map[string]interface{})
		if address == nil {
			continue
		}
		host, _ := address["host"].(string)
		host = strings.TrimSpace(host)
		port, ok := privatePortFromValue(address["port"])
		if host == "" || !ok {
			continue
		}
		addresses = append(addresses, networkPublicAddress{host: host, port: port})
	}
	return addresses
}

func ingressSchemeByHost(ingresses []map[string]interface{}) map[string]string {
	result := make(map[string]string)
	for _, ing := range ingresses {
		spec, _ := ing["spec"].(map[string]interface{})
		if spec == nil {
			continue
		}
		tlsHosts := getTLSHosts(spec)
		rules, _ := spec["rules"].([]interface{})
		for _, item := range rules {
			rule, _ := item.(map[string]interface{})
			if rule == nil {
				continue
			}
			host, _ := rule["host"].(string)
			host = strings.TrimSpace(host)
			if host == "" || isPlaceholderIngressHost(host) {
				continue
			}
			scheme := "http"
			if tlsHosts[host] {
				scheme = "https"
			}
			result[host] = scheme
		}
	}
	return result
}

func publicAccessStatusFromPhase(phaseValue interface{}) string {
	phase, _ := phaseValue.(string)
	switch phase {
	case "Running":
		return "accessible"
	case "Progressing":
		return "progressing"
	case "Failed", "Degraded", "Paused":
		return "inaccessible"
	default:
		return "unknown"
	}
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

// buildConnectionRows composes internal and external addresses for the older status.variables table.
// These rows are derived from observed resources, not from the AP Network contract.
func buildConnectionRows(ap map[string]interface{}, ingresses, services []map[string]interface{}) []map[string]interface{} {
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

	var rows []map[string]interface{}
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
				rows = append(rows, map[string]interface{}{
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
					rows = append(rows, map[string]interface{}{
						"name":    externalName,
						"address": extAddr,
						"type":    "external",
						"port":    port,
					})
				}
			}
		}
	}
	return rows
}

// buildVariablesFromConnectionRows converts observed connection rows to the variable table.
// Each row becomes { name, value } with the address as the value.
func buildVariablesFromConnectionRows(rows []map[string]interface{}) []map[string]interface{} {
	if len(rows) == 0 {
		return nil
	}
	vars := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		name, _ := row["name"].(string)
		addr, _ := row["address"].(string)
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
