package ap

import (
	"fmt"
	"strconv"
	"testing"
)

func TestAPTransformEnrichesPrivateNetworkFromService(t *testing.T) {
	tests := []struct {
		name        string
		privatePort int
		wantAddress string
	}{
		{
			name:        "default http port",
			privatePort: 80,
			wantAddress: "http://api-service-port-80.default.svc.cluster.local",
		},
		{
			name:        "non-default port",
			privatePort: 8080,
			wantAddress: "http://api-service-port-8080.default.svc.cluster.local:8080",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			out := APWithIngressesAndServicesFromList(
				map[string]interface{}{
					"metadata": map[string]interface{}{
						"name":      "api",
						"namespace": "default",
					},
					"spec": map[string]interface{}{
						"input": map[string]interface{}{
							"network": map[string]interface{}{
								"privatePort": tt.privatePort,
							},
						},
					},
				},
				nil,
				[]map[string]interface{}{
					{
						"metadata": map[string]interface{}{
							"name":      "api-service-port-" + intString(tt.privatePort),
							"namespace": "default",
						},
						"spec": map[string]interface{}{
							"ports": []interface{}{
								map[string]interface{}{"port": tt.privatePort},
							},
						},
					},
				},
			)

			status := out["status"].(map[string]interface{})
			network := status["network"].(map[string]interface{})
			if got := network["privatePort"]; got != tt.privatePort {
				t.Fatalf("status.network.privatePort = %v, want %d", got, tt.privatePort)
			}
			if got := network["privateAddress"]; got != tt.wantAddress {
				t.Fatalf("status.network.privateAddress = %v, want %s", got, tt.wantAddress)
			}
		})
	}
}

func TestAPTransformPreservesExistingPrivateNetworkAddress(t *testing.T) {
	out := APWithIngressesAndServicesFromList(
		map[string]interface{}{
			"metadata": map[string]interface{}{
				"name":      "api",
				"namespace": "default",
			},
			"spec": map[string]interface{}{
				"input": map[string]interface{}{
					"network": map[string]interface{}{
						"privatePort": 8080,
					},
				},
			},
			"status": map[string]interface{}{
				"network": map[string]interface{}{
					"privateAddress": "http://api.default.svc:8080",
					"privatePort":    8080,
				},
			},
		},
		nil,
		[]map[string]interface{}{
			{
				"metadata": map[string]interface{}{
					"name":      "api-service-port-8080",
					"namespace": "default",
				},
				"spec": map[string]interface{}{
					"ports": []interface{}{
						map[string]interface{}{"port": 8080},
					},
				},
			},
		},
	)

	status := out["status"].(map[string]interface{})
	network := status["network"].(map[string]interface{})
	if got := network["privateAddress"]; got != "http://api.default.svc:8080" {
		t.Fatalf("status.network.privateAddress = %v, want preserved address", got)
	}
}

func TestAPTransformEnrichesPublicNetworkAddressesFromIngress(t *testing.T) {
	out := APWithIngressesAndServicesFromList(
		map[string]interface{}{
			"metadata": map[string]interface{}{
				"name":      "api",
				"namespace": "default",
			},
			"spec": map[string]interface{}{
				"input": map[string]interface{}{
					"network": map[string]interface{}{
						"privatePort": 8080,
						"publicAddresses": []interface{}{
							map[string]interface{}{"host": "api.example.com", "port": 8080},
							map[string]interface{}{"host": "api-alt.example.com", "port": 8080},
							map[string]interface{}{"host": "admin.example.com", "port": 9000},
						},
					},
				},
			},
			"status": map[string]interface{}{
				"phase": "Running",
			},
		},
		[]map[string]interface{}{
			{
				"metadata": map[string]interface{}{
					"name":      "api-ingress",
					"namespace": "default",
				},
				"spec": map[string]interface{}{
					"rules": []interface{}{
						ingressRule("api.example.com", "api-service", 8080),
						ingressRule("api-alt.example.com", "api-service", 8080),
						ingressRule("admin.example.com", "api-service", 9000),
					},
					"tls": []interface{}{
						map[string]interface{}{
							"hosts": []interface{}{"api.example.com", "api-alt.example.com", "admin.example.com"},
						},
					},
				},
			},
		},
		[]map[string]interface{}{
			{
				"metadata": map[string]interface{}{
					"name":      "api-service",
					"namespace": "default",
				},
				"spec": map[string]interface{}{
					"ports": []interface{}{
						map[string]interface{}{"port": 8080},
						map[string]interface{}{"port": 9000},
					},
				},
			},
		},
	)

	status := out["status"].(map[string]interface{})
	network := status["network"].(map[string]interface{})
	addresses := network["publicAddresses"].([]map[string]interface{})
	assertPublicNetworkAddress(t, addresses, "api.example.com", "https://api.example.com/", 8080)
	assertPublicNetworkAddress(t, addresses, "api-alt.example.com", "https://api-alt.example.com/", 8080)
	assertPublicNetworkAddress(t, addresses, "admin.example.com", "https://admin.example.com/", 9000)
}

func TestAPTransformDoesNotInferNetworkFromRetiredSpecEndpoints(t *testing.T) {
	out := APWithIngressesAndServicesFromList(
		map[string]interface{}{
			"metadata": map[string]interface{}{
				"name":      "api",
				"namespace": "default",
			},
			"spec": map[string]interface{}{
				"endpoints": []interface{}{
					map[string]interface{}{"host": "api.example.com", "port": 8080},
				},
			},
		},
		[]map[string]interface{}{
			{
				"metadata": map[string]interface{}{
					"name":      "api-ingress",
					"namespace": "default",
				},
				"spec": map[string]interface{}{
					"rules": []interface{}{
						ingressRule("api.example.com", "api-service", 8080),
					},
				},
			},
		},
		nil,
	)

	status := out["status"].(map[string]interface{})
	if got := status["variables"]; got != nil {
		t.Fatalf("status.variables from retired spec endpoints = %v, want nil", got)
	}
	if _, ok := status["network"]; ok {
		t.Fatal("status.network should not be inferred from retired spec endpoints")
	}
}

func TestAPTransformIgnoresInvalidPrivateNetworkPort(t *testing.T) {
	for _, privatePort := range []interface{}{0, 65536, 8080.5} {
		t.Run(fmt.Sprint(privatePort), func(t *testing.T) {
			out := APWithIngressesAndServicesFromList(
				map[string]interface{}{
					"metadata": map[string]interface{}{
						"name":      "api",
						"namespace": "default",
					},
					"spec": map[string]interface{}{
						"input": map[string]interface{}{
							"network": map[string]interface{}{
								"privatePort": privatePort,
							},
						},
					},
				},
				nil,
				[]map[string]interface{}{
					{
						"metadata": map[string]interface{}{
							"name":      "api-service-port-8080",
							"namespace": "default",
						},
						"spec": map[string]interface{}{
							"ports": []interface{}{
								map[string]interface{}{"port": 8080},
							},
						},
					},
				},
			)

			status := out["status"].(map[string]interface{})
			if _, ok := status["network"]; ok {
				t.Fatalf("status.network exists for invalid privatePort %v", privatePort)
			}
		})
	}
}

func intString(n int) string {
	return strconv.Itoa(n)
}

func ingressRule(host string, serviceName string, port int) map[string]interface{} {
	return map[string]interface{}{
		"host": host,
		"http": map[string]interface{}{
			"paths": []interface{}{
				map[string]interface{}{
					"backend": map[string]interface{}{
						"service": map[string]interface{}{
							"name": serviceName,
							"port": map[string]interface{}{"number": port},
						},
					},
					"path": "/",
				},
			},
		},
	}
}

func assertPublicNetworkAddress(t *testing.T, addresses []map[string]interface{}, host string, url string, port int) {
	t.Helper()
	for _, address := range addresses {
		if address["host"] != host {
			continue
		}
		if got := address["url"]; got != url {
			t.Fatalf("public address %s url = %v, want %s", host, got, url)
		}
		if got := address["port"]; got != port {
			t.Fatalf("public address %s port = %v, want %d", host, got, port)
		}
		if got := address["type"]; got != "platform" {
			t.Fatalf("public address %s type = %v, want platform", host, got)
		}
		if got := address["status"]; got != "accessible" {
			t.Fatalf("public address %s status = %v, want accessible", host, got)
		}
		return
	}
	t.Fatalf("missing public address for host %s", host)
}
