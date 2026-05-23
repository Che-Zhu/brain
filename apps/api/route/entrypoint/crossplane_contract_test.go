package entrypoint

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"text/template"

	"github.com/Masterminds/sprig/v3"
	"sigs.k8s.io/yaml"
)

func TestEntryPointXRDIncludesPublicAccessContract(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/service/entrypoint/entrypoint.yaml"))
	if err != nil {
		t.Fatalf("read EntryPoint XRD: %v", err)
	}

	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse EntryPoint XRD: %v", err)
	}

	specProps := xrdSpecProperties(t, doc)
	apRef := asMap(t, specProps["apRef"], "spec.apRef")
	if got := apRef["type"]; got != "string" {
		t.Fatalf("spec.apRef type = %v, want string", got)
	}

	targets := asMap(t, specProps["targets"], "spec.targets")
	if got := targets["type"]; got != "array" {
		t.Fatalf("spec.targets type = %v, want array", got)
	}
	targetItemProps := asMap(t, asMap(t, targets["items"], "spec.targets.items")["properties"], "spec.targets.items.properties")
	for _, field := range []string{"id", "port", "platformDomain", "status"} {
		if _, ok := targetItemProps[field]; !ok {
			t.Fatalf("spec.targets.items.%s is missing", field)
		}
	}

	customDomains := asMap(t, specProps["customDomains"], "spec.customDomains")
	if got := customDomains["type"]; got != "array" {
		t.Fatalf("spec.customDomains type = %v, want array", got)
	}

	statusProps := xrdStatusProperties(t, doc)
	phase := asMap(t, statusProps["phase"], "status.phase")
	if got := phase["type"]; got != "string" {
		t.Fatalf("status.phase type = %v, want string", got)
	}
	statusTargets := asMap(t, statusProps["targets"], "status.targets")
	if got := statusTargets["type"]; got != "array" {
		t.Fatalf("status.targets type = %v, want array", got)
	}
}

func TestEntryPointMinimalCompositionSurfacesAggregateStatus(t *testing.T) {
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/entrypoint/entrypoints-minimal-composition.yaml"))

	for _, fragment := range []string{
		`{{- $phase := "Not configured" }}`,
		`{{- if $allOk }}{{ $phase = "Accessible" }}`,
		`{{- else if $anyFail }}{{ $phase = "Inaccessible" }}`,
		`{{- else if $anyProg }}{{ $phase = "Progressing" }}`,
		`kind: EntryPoint`,
		`phase: {{ $phase | quote }}`,
		`targets:`,
		`platformDomain: {{ .platformDomain | quote }}`,
	} {
		if !strings.Contains(templateText, fragment) {
			t.Fatalf("expected EntryPoint composition template to contain %q", fragment)
		}
	}

	if _, err := template.New("entrypoints-minimal").Funcs(sprig.TxtFuncMap()).Parse(templateText); err != nil {
		t.Fatalf("parse EntryPoint composition template: %v", err)
	}
}

func TestAPCompositionRendersEntryPointForPublicTargets(t *testing.T) {
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/deployments/aps-deployment-ingress-go-templating.yaml"))

	for _, fragment := range []string{
		`composition-resource-name: app-entrypoint`,
		`kind: EntryPoint`,
		`apRef: {{ $name | quote }}`,
		`targets:`,
		`{{ range $networkPublicAddresses }}`,
		`platformDomain: {{ .host | quote }}`,
		`status: {{ $entryTargetStatus | quote }}`,
	} {
		if !strings.Contains(templateText, fragment) {
			t.Fatalf("expected AP composition template to contain %q", fragment)
		}
	}

	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(interface{}, string) map[string]interface{} {
		return nil
	}
	funcs["toYaml"] = func(v interface{}) string {
		raw, _ := yaml.Marshal(v)
		return string(raw)
	}
	if _, err := template.New("aps-deployment-ingress").Funcs(funcs).Parse(templateText); err != nil {
		t.Fatalf("parse AP composition template: %v", err)
	}
}

func TestAPCompositionCreatesEntryPointForPublicAddresses(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": map[string]interface{}{
					"metadata": map[string]interface{}{
						"labels": map[string]interface{}{
							"region": "usw.sealos.app",
						},
						"name":      "web",
						"namespace": "project-a",
						"uid":       "ap-uid-1",
					},
					"spec": map[string]interface{}{
						"input": map[string]interface{}{
							"image": "nginx:1.27",
							"network": map[string]interface{}{
								"privatePort": 9000,
								"platformAddresses": []interface{}{
									map[string]interface{}{"id": "pa_web001", "port": 80},
									map[string]interface{}{"id": "pa_api001", "port": 8080},
								},
							},
						},
					},
				},
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	entryPointObject := singleEntryPointObject(t, out)
	assertManagementPolicies(t, entryPointObject, "Observe", "Create", "Update")
	entryPoint := manifestFromObject(t, entryPointObject, "entrypoint object")
	metadata := asMap(t, entryPoint["metadata"], "entrypoint.metadata")
	if got := metadata["name"]; got != "web" {
		t.Fatalf("EntryPoint metadata.name = %v, want web", got)
	}
	if got := metadata["namespace"]; got != "project-a" {
		t.Fatalf("EntryPoint metadata.namespace = %v, want project-a", got)
	}

	spec := asMap(t, entryPoint["spec"], "entrypoint.spec")
	if got := spec["apRef"]; got != "web" {
		t.Fatalf("EntryPoint spec.apRef = %v, want web", got)
	}
	targets := asSlice(t, spec["targets"], "entrypoint.spec.targets")
	if got := len(targets); got != 2 {
		t.Fatalf("EntryPoint target count = %d, want 2", got)
	}

	webHost := platformHost("project-a", "web", "ap-uid-1", "pa_web001", "usw.sealos.app")
	apiHost := platformHost("project-a", "web", "ap-uid-1", "pa_api001", "usw.sealos.app")
	targetByHost := map[string]map[string]interface{}{}
	for i, target := range targets {
		targetMap := asMap(t, target, fmt.Sprintf("entrypoint.spec.targets[%d]", i))
		host, ok := targetMap["platformDomain"].(string)
		if !ok {
			t.Fatalf("target %d platformDomain is %T, want string", i, targetMap["platformDomain"])
		}
		targetByHost[host] = targetMap
	}
	for host, port := range map[string]int{apiHost: 8080, webHost: 80} {
		target, ok := targetByHost[host]
		if !ok {
			t.Fatalf("missing EntryPoint target for Public Address %s", host)
		}
		if got := numberAsInt(t, target["port"], fmt.Sprintf("target %s port", host)); got != port {
			t.Fatalf("target %s port = %d, want %d", host, got, port)
		}
		if got := target["status"]; got != "accessible" {
			t.Fatalf("target %s status = %v, want accessible", host, got)
		}
	}
}

func TestAPCompositionOmitsEntryPointWithoutPublicPlatformHostname(t *testing.T) {
	tests := []struct {
		name string
		ap   map[string]interface{}
	}{
		{
			name: "private network only",
			ap: apResource(map[string]interface{}{
				"input": map[string]interface{}{
					"network": map[string]interface{}{
						"privatePort": 80,
					},
				},
			}, map[string]interface{}{
				"region": "usw.sealos.app",
			}),
		},
		{
			name: "Platform Address without routing domain",
			ap: apResource(map[string]interface{}{
				"input": map[string]interface{}{
					"network": map[string]interface{}{
						"privatePort": 80,
						"platformAddresses": []interface{}{
							map[string]interface{}{"id": "pa_abc123", "port": 80},
						},
					},
				},
			}, nil),
		},
		{
			name: "port-only Platform Address",
			ap: apResource(map[string]interface{}{
				"input": map[string]interface{}{
					"network": map[string]interface{}{
						"privatePort": 80,
						"platformAddresses": []interface{}{
							map[string]interface{}{"port": 80},
						},
					},
				},
			}, map[string]interface{}{
				"region": "usw.sealos.app",
			}),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			out := renderAPComposition(t, map[string]interface{}{
				"observed": map[string]interface{}{
					"composite": map[string]interface{}{
						"resource": tt.ap,
					},
				},
			}, map[string]map[string]interface{}{
				"app-deployment": runningDeployment(),
			})

			if got := entryPointObjects(t, out); len(got) != 0 {
				t.Fatalf("EntryPoint manifest count = %d, want 0", len(got))
			}
		})
	}
}

func TestAPCompositionIgnoresLegacyEndpointMatrixPath(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"endpoints": []interface{}{
							map[string]interface{}{"host": "api.example.com", "port": 8080},
						},
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	if got := entryPointObjects(t, out); len(got) != 0 {
		t.Fatalf("EntryPoint manifest count = %d, want 0", len(got))
	}
	if got := ingressObjects(t, out); len(got) != 0 {
		t.Fatalf("Ingress manifest count = %d, want 0", len(got))
	}
	if got := serviceObjects(t, out); len(got) != 0 {
		t.Fatalf("Service manifest count = %d, want 0", len(got))
	}

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	if _, ok := status["endpoints"]; ok {
		t.Fatal("AP status included retired endpoints field")
	}
	if _, ok := status["network"]; ok {
		t.Fatal("AP status.network should not be inferred from retired endpoint fields")
	}
}

func TestAPCompositionRendersPrivateOnlyNetworkPath(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"network": map[string]interface{}{
							"privatePort": 8080,
						},
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	if got := entryPointObjects(t, out); len(got) != 0 {
		t.Fatalf("EntryPoint manifest count = %d, want 0", len(got))
	}
	if got := ingressObjects(t, out); len(got) != 0 {
		t.Fatalf("Ingress manifest count = %d, want 0", len(got))
	}

	services := serviceObjects(t, out)
	if got := len(services); got != 1 {
		t.Fatalf("Service manifest count = %d, want 1", got)
	}
	serviceSpec := asMap(t, services[0]["spec"], "service.spec")
	servicePorts := asSlice(t, serviceSpec["ports"], "service.spec.ports")
	servicePort := asMap(t, servicePorts[0], "service.spec.ports[0]")
	if got := numberAsInt(t, servicePort["port"], "service.spec.ports[0].port"); got != 8080 {
		t.Fatalf("Service port = %d, want 8080", got)
	}
	if got := numberAsInt(t, servicePort["targetPort"], "service.spec.ports[0].targetPort"); got != 8080 {
		t.Fatalf("Service targetPort = %d, want 8080", got)
	}

	deployment := singleKindObject(t, out, "Deployment")
	deploymentSpec := asMap(t, deployment["spec"], "deployment.spec")
	templateSpec := asMap(t, asMap(t, deploymentSpec["template"], "deployment.spec.template")["spec"], "deployment.spec.template.spec")
	containers := asSlice(t, templateSpec["containers"], "deployment.spec.template.spec.containers")
	container := asMap(t, containers[0], "deployment.spec.template.spec.containers[0]")
	containerPorts := asSlice(t, container["ports"], "deployment container ports")
	containerPort := asMap(t, containerPorts[0], "deployment container ports[0]")
	if got := numberAsInt(t, containerPort["containerPort"], "containerPort"); got != 8080 {
		t.Fatalf("Deployment containerPort = %d, want 8080", got)
	}

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	network := asMap(t, status["network"], "ap.status.network")
	if got := network["privateAddress"]; got != "http://web-service.project-a.svc:8080" {
		t.Fatalf("status.network.privateAddress = %v, want private service address", got)
	}
	if got := numberAsInt(t, network["privatePort"], "ap.status.network.privatePort"); got != 8080 {
		t.Fatalf("status.network.privatePort = %d, want 8080", got)
	}
}

func TestAPCompositionRendersCanonicalFixedReplicaStrategy(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"resource": map[string]interface{}{
						"replicaStrategy": map[string]interface{}{
							"type": "fixed",
							"fixed": map[string]interface{}{
								"replicas": 4,
							},
						},
						"replicas": 2,
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	deployment := singleKindObject(t, out, "Deployment")
	deploymentSpec := asMap(t, deployment["spec"], "deployment.spec")
	if got := numberAsInt(t, deploymentSpec["replicas"], "deployment.spec.replicas"); got != 4 {
		t.Fatalf("Deployment replicas = %d, want canonical fixed replicas 4", got)
	}
	deploymentAnnotations := asMap(t, asMap(t, deployment["metadata"], "deployment.metadata")["annotations"], "deployment.metadata.annotations")
	if got := deploymentAnnotations["deploy.cloud.sealos.io/minReplicas"]; got != "4" {
		t.Fatalf("Deployment minReplicas annotation = %v, want 4", got)
	}
	if got := deploymentAnnotations["deploy.cloud.sealos.io/maxReplicas"]; got != "4" {
		t.Fatalf("Deployment maxReplicas annotation = %v, want 4", got)
	}
	if got := kindObjects(t, out, func(obj map[string]interface{}) bool {
		return obj["kind"] == "HorizontalPodAutoscaler"
	}); len(got) != 0 {
		t.Fatalf("HPA manifest count = %d, want 0 for fixed replica strategy", len(got))
	}
}

func TestAPCompositionRendersLegacyReplicasAsFixedReplicaStrategy(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"resource": map[string]interface{}{
						"replicas": 3,
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	deployment := singleKindObject(t, out, "Deployment")
	deploymentSpec := asMap(t, deployment["spec"], "deployment.spec")
	if got := numberAsInt(t, deploymentSpec["replicas"], "deployment.spec.replicas"); got != 3 {
		t.Fatalf("Deployment replicas = %d, want legacy fixed replicas 3", got)
	}
	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	if got := status["phase"]; got != "Running" {
		t.Fatalf("AP status.phase = %v, want Running", got)
	}
	configMap := singleKindObject(t, out, "ConfigMap")
	data := asMap(t, configMap["data"], "configmap.data")
	configYaml, ok := data["config.yaml"].(string)
	if !ok {
		t.Fatalf("config.yaml is %T, want string", data["config.yaml"])
	}
	if !strings.Contains(configYaml, "replicaStrategy:") ||
		!strings.Contains(configYaml, "replicas: 3") ||
		!strings.Contains(configYaml, "type: fixed") {
		t.Fatalf("effective config did not include canonical fixed replica strategy:\n%s", configYaml)
	}
	if got := kindObjects(t, out, func(obj map[string]interface{}) bool {
		return obj["kind"] == "HorizontalPodAutoscaler"
	}); len(got) != 0 {
		t.Fatalf("HPA manifest count = %d, want 0 for legacy fixed replicas", len(got))
	}
}

func TestAPCompositionRendersPublicAddressesFromNetworkContract(t *testing.T) {
	apiHost := platformHost("project-a", "web", "ap-uid-1", "pa_abc123", "usw.sealos.app")
	apiAltHost := platformHost("project-a", "web", "ap-uid-1", "pa_def456", "usw.sealos.app")
	adminHost := platformHost("project-a", "web", "ap-uid-1", "pa_admin9", "usw.sealos.app")
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"network": map[string]interface{}{
							"privatePort": 8080,
							"platformAddresses": []interface{}{
								map[string]interface{}{"id": "pa_abc123", "port": 8080},
								map[string]interface{}{"id": "pa_def456", "port": 8080},
								map[string]interface{}{"id": "pa_admin9", "port": 9000},
							},
						},
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
		"app-ingress": {
			"spec": map[string]interface{}{
				"tls": []interface{}{
					map[string]interface{}{"hosts": []interface{}{apiHost, apiAltHost, adminHost}},
				},
				"rules": []interface{}{
					ingressRule(apiHost, "web-service", 8080),
					ingressRule(apiAltHost, "web-service", 8080),
					ingressRule(adminHost, "web-service", 9000),
				},
			},
		},
	})

	services := serviceObjects(t, out)
	if got := len(services); got != 1 {
		t.Fatalf("Service manifest count = %d, want 1", got)
	}
	serviceMetadata := asMap(t, services[0]["metadata"], "service.metadata")
	if got := serviceMetadata["name"]; got != "web-service" {
		t.Fatalf("Service metadata.name = %v, want web-service", got)
	}
	serviceSpec := asMap(t, services[0]["spec"], "service.spec")
	assertPortNumbers(t, asSlice(t, serviceSpec["ports"], "service.spec.ports"), []int{8080, 9000}, "service.spec.ports")

	deployment := singleKindObject(t, out, "Deployment")
	deploymentSpec := asMap(t, deployment["spec"], "deployment.spec")
	templateSpec := asMap(t, asMap(t, deploymentSpec["template"], "deployment.spec.template")["spec"], "deployment.spec.template.spec")
	containers := asSlice(t, templateSpec["containers"], "deployment.spec.template.spec.containers")
	container := asMap(t, containers[0], "deployment.spec.template.spec.containers[0]")
	assertPortNumbers(t, asSlice(t, container["ports"], "deployment container ports"), []int{8080, 9000}, "deployment container ports")

	ingresses := ingressObjects(t, out)
	if got := len(ingresses); got != 1 {
		t.Fatalf("Ingress manifest count = %d, want 1", got)
	}
	ingressSpec := asMap(t, ingresses[0]["spec"], "ingress.spec")
	rules := asSlice(t, ingressSpec["rules"], "ingress.spec.rules")
	assertIngressBackend(t, rules, apiHost, "web-service", 8080)
	assertIngressBackend(t, rules, apiAltHost, "web-service", 8080)
	assertIngressBackend(t, rules, adminHost, "web-service", 9000)

	entryPoint := manifestFromObject(t, singleEntryPointObject(t, out), "entrypoint object")
	entryPointSpec := asMap(t, entryPoint["spec"], "entrypoint.spec")
	entryPointTargets := asSlice(t, entryPointSpec["targets"], "entrypoint.spec.targets")
	assertEntryPointTarget(t, entryPointTargets, apiHost, 8080)
	assertEntryPointTarget(t, entryPointTargets, apiAltHost, 8080)
	assertEntryPointTarget(t, entryPointTargets, adminHost, 9000)

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	network := asMap(t, status["network"], "ap.status.network")
	if got := network["privateAddress"]; got != "http://web-service.project-a.svc:8080" {
		t.Fatalf("status.network.privateAddress = %v, want private service address", got)
	}
	publicAddresses := asSlice(t, network["publicAddresses"], "ap.status.network.publicAddresses")
	assertStatusPublicAddress(t, publicAddresses, apiHost, fmt.Sprintf("https://%s/", apiHost), 8080)
	assertStatusPublicAddress(t, publicAddresses, apiAltHost, fmt.Sprintf("https://%s/", apiAltHost), 8080)
	assertStatusPublicAddress(t, publicAddresses, adminHost, fmt.Sprintf("https://%s/", adminHost), 9000)
}

func TestAPCompositionRendersV1PlatformAddressesFromNetworkContract(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"network": map[string]interface{}{
							"privatePort": 8080,
							"platformAddresses": []interface{}{
								map[string]interface{}{"id": "pa_abc123", "port": 8080},
								map[string]interface{}{"id": "pa_def456", "port": 8080},
								map[string]interface{}{"id": "pa_admin9", "port": 9000},
							},
						},
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
		"app-ingress": {
			"spec": map[string]interface{}{
				"tls": []interface{}{
					map[string]interface{}{"hosts": []interface{}{
						platformHost("project-a", "web", "ap-uid-1", "pa_abc123", "usw.sealos.app"),
						platformHost("project-a", "web", "ap-uid-1", "pa_def456", "usw.sealos.app"),
						platformHost("project-a", "web", "ap-uid-1", "pa_admin9", "usw.sealos.app"),
					}},
				},
			},
		},
	})

	apiHost := platformHost("project-a", "web", "ap-uid-1", "pa_abc123", "usw.sealos.app")
	apiAltHost := platformHost("project-a", "web", "ap-uid-1", "pa_def456", "usw.sealos.app")
	adminHost := platformHost("project-a", "web", "ap-uid-1", "pa_admin9", "usw.sealos.app")

	services := serviceObjects(t, out)
	if got := len(services); got != 1 {
		t.Fatalf("Service manifest count = %d, want 1", got)
	}
	serviceSpec := asMap(t, services[0]["spec"], "service.spec")
	assertPortNumbers(t, asSlice(t, serviceSpec["ports"], "service.spec.ports"), []int{8080, 9000}, "service.spec.ports")

	ingressSpec := asMap(t, ingressObjects(t, out)[0]["spec"], "ingress.spec")
	rules := asSlice(t, ingressSpec["rules"], "ingress.spec.rules")
	assertIngressBackend(t, rules, apiHost, "web-service", 8080)
	assertIngressBackend(t, rules, apiAltHost, "web-service", 8080)
	assertIngressBackend(t, rules, adminHost, "web-service", 9000)

	entryPoint := manifestFromObject(t, singleEntryPointObject(t, out), "entrypoint object")
	entryPointSpec := asMap(t, entryPoint["spec"], "entrypoint.spec")
	entryPointTargets := asSlice(t, entryPointSpec["targets"], "entrypoint.spec.targets")
	assertEntryPointTargetByID(t, entryPointTargets, "pa_abc123", apiHost, 8080)
	assertEntryPointTargetByID(t, entryPointTargets, "pa_def456", apiAltHost, 8080)
	assertEntryPointTargetByID(t, entryPointTargets, "pa_admin9", adminHost, 9000)

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	network := asMap(t, status["network"], "ap.status.network")
	publicAddresses := asSlice(t, network["publicAddresses"], "ap.status.network.publicAddresses")
	assertStatusPublicAddressByID(t, publicAddresses, "pa_abc123", apiHost, fmt.Sprintf("https://%s/", apiHost), 8080)
	assertStatusPublicAddressByID(t, publicAddresses, "pa_def456", apiAltHost, fmt.Sprintf("https://%s/", apiAltHost), 8080)
	assertStatusPublicAddressByID(t, publicAddresses, "pa_admin9", adminHost, fmt.Sprintf("https://%s/", adminHost), 9000)
}

func TestProviderKubernetesRBACAllowsEntryPointWrites(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "packages/crossplane/public/provider-kubernetes-rbac.yaml"))
	if err != nil {
		t.Fatalf("read provider-kubernetes RBAC: %v", err)
	}
	text := string(raw)
	for _, fragment := range []string{
		`resources: ["entrypoints"]`,
		`verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]`,
	} {
		if !strings.Contains(text, fragment) {
			t.Fatalf("expected provider-kubernetes RBAC to contain %q", fragment)
		}
	}
}

func TestAPCompositionAllowsGeneratedEntryPointCleanup(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"network": map[string]interface{}{
							"privatePort": 80,
							"platformAddresses": []interface{}{
								map[string]interface{}{"id": "pa_web001", "port": 80},
							},
						},
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}, map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	})

	entryPointObject := singleEntryPointObject(t, out)
	assertManagementPolicies(t, entryPointObject, "Observe", "Create", "Update", "Delete")
}

func repoRoot(t *testing.T) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(currentFile), "../../../.."))
}

func apResource(spec map[string]interface{}, labels map[string]interface{}) map[string]interface{} {
	metadata := map[string]interface{}{
		"name":      "web",
		"namespace": "project-a",
		"uid":       "ap-uid-1",
	}
	if labels != nil {
		metadata["labels"] = labels
	}
	input := map[string]interface{}{
		"image": "nginx:1.27",
	}
	fullSpec := map[string]interface{}{
		"input": input,
	}
	for key, value := range spec {
		if key == "input" {
			inputMap, _ := value.(map[string]interface{})
			for inputKey, inputValue := range inputMap {
				input[inputKey] = inputValue
			}
			continue
		}
		switch key {
		case "env", "image", "imagePullPolicy", "network", "probes":
			input[key] = value
		default:
			fullSpec[key] = value
		}
	}
	return map[string]interface{}{
		"metadata": metadata,
		"spec":     fullSpec,
	}
}

func renderAPComposition(t *testing.T, data map[string]interface{}, composed map[string]map[string]interface{}) string {
	t.Helper()
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/deployments/aps-deployment-ingress-go-templating.yaml"))
	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(_ interface{}, name string) map[string]interface{} {
		return composed[name]
	}
	funcs["toYaml"] = func(v interface{}) string {
		raw, err := yaml.Marshal(v)
		if err != nil {
			t.Fatalf("marshal template value as YAML: %v", err)
		}
		return string(raw)
	}

	tpl, err := template.New("aps-deployment-ingress").Funcs(funcs).Parse(templateText)
	if err != nil {
		t.Fatalf("parse AP composition template: %v", err)
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		t.Fatalf("execute AP composition template: %v", err)
	}
	return buf.String()
}

func runningDeployment() map[string]interface{} {
	return map[string]interface{}{
		"status": map[string]interface{}{
			"conditions": []interface{}{
				map[string]interface{}{"status": "True", "type": "Available"},
				map[string]interface{}{"reason": "NewReplicaSetAvailable", "status": "True", "type": "Progressing"},
			},
		},
	}
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
					"path":     "/",
					"pathType": "Prefix",
				},
			},
		},
	}
}

func singleEntryPointObject(t *testing.T, output string) map[string]interface{} {
	t.Helper()
	objects := entryPointObjects(t, output)
	if got := len(objects); got != 1 {
		t.Fatalf("EntryPoint object count = %d, want 1", got)
	}
	return objects[0]
}

func entryPointObjects(t *testing.T, output string) []map[string]interface{} {
	t.Helper()
	return kindObjects(t, output, func(obj map[string]interface{}) bool {
		if obj["kind"] != "Object" {
			return false
		}
		manifest := manifestFromObject(t, obj, "entrypoint object")
		return manifest["kind"] == "EntryPoint"
	})
}

func ingressObjects(t *testing.T, output string) []map[string]interface{} {
	t.Helper()
	return kindObjects(t, output, func(obj map[string]interface{}) bool {
		return obj["kind"] == "Ingress"
	})
}

func serviceObjects(t *testing.T, output string) []map[string]interface{} {
	t.Helper()
	return kindObjects(t, output, func(obj map[string]interface{}) bool {
		return obj["kind"] == "Service"
	})
}

func singleKindObject(t *testing.T, output string, kind string) map[string]interface{} {
	t.Helper()
	objects := kindObjects(t, output, func(obj map[string]interface{}) bool {
		return obj["kind"] == kind
	})
	if got := len(objects); got != 1 {
		t.Fatalf("%s manifest count = %d, want 1", kind, got)
	}
	return objects[0]
}

func kindObjects(t *testing.T, output string, match func(map[string]interface{}) bool) []map[string]interface{} {
	t.Helper()
	var objects []map[string]interface{}
	for i, doc := range strings.Split(output, "\n---") {
		doc = strings.TrimSpace(doc)
		if doc == "" {
			continue
		}
		var obj map[string]interface{}
		if err := yaml.Unmarshal([]byte(doc), &obj); err != nil {
			t.Fatalf("parse rendered YAML document %d: %v\n%s", i, err, doc)
		}
		if match(obj) {
			objects = append(objects, obj)
		}
	}
	return objects
}

func manifestFromObject(t *testing.T, obj map[string]interface{}, path string) map[string]interface{} {
	t.Helper()
	spec := asMap(t, obj["spec"], path+".spec")
	forProvider := asMap(t, spec["forProvider"], path+".spec.forProvider")
	return asMap(t, forProvider["manifest"], path+".spec.forProvider.manifest")
}

func assertManagementPolicies(t *testing.T, obj map[string]interface{}, want ...string) {
	t.Helper()
	spec := asMap(t, obj["spec"], "entrypoint object.spec")
	policies := asSlice(t, spec["managementPolicies"], "entrypoint object.spec.managementPolicies")
	got := map[string]bool{}
	for _, policy := range policies {
		name, ok := policy.(string)
		if !ok {
			t.Fatalf("management policy is %T, want string", policy)
		}
		got[name] = true
	}
	for _, policy := range want {
		if !got[policy] {
			t.Fatalf("missing EntryPoint Object management policy %q in %v", policy, policies)
		}
	}
}

func assertPortNumbers(t *testing.T, ports []interface{}, want []int, path string) {
	t.Helper()
	if len(ports) != len(want) {
		t.Fatalf("%s count = %d, want %d", path, len(ports), len(want))
	}
	for i, port := range ports {
		portMap := asMap(t, port, fmt.Sprintf("%s[%d]", path, i))
		rawPort := portMap["port"]
		if rawPort == nil {
			rawPort = portMap["containerPort"]
		}
		got := numberAsInt(t, rawPort, fmt.Sprintf("%s[%d].port", path, i))
		if got != want[i] {
			t.Fatalf("%s[%d].port = %d, want %d", path, i, got, want[i])
		}
	}
}

func assertIngressBackend(t *testing.T, rules []interface{}, host string, serviceName string, port int) {
	t.Helper()
	for i, rule := range rules {
		ruleMap := asMap(t, rule, fmt.Sprintf("ingress.spec.rules[%d]", i))
		if ruleMap["host"] != host {
			continue
		}
		httpRule := asMap(t, ruleMap["http"], fmt.Sprintf("ingress.spec.rules[%d].http", i))
		paths := asSlice(t, httpRule["paths"], fmt.Sprintf("ingress.spec.rules[%d].http.paths", i))
		path := asMap(t, paths[0], fmt.Sprintf("ingress.spec.rules[%d].http.paths[0]", i))
		backend := asMap(t, path["backend"], fmt.Sprintf("ingress.spec.rules[%d].http.paths[0].backend", i))
		service := asMap(t, backend["service"], fmt.Sprintf("ingress.spec.rules[%d].http.paths[0].backend.service", i))
		if got := service["name"]; got != serviceName {
			t.Fatalf("Ingress backend for host %s service name = %v, want %s", host, got, serviceName)
		}
		servicePort := asMap(t, service["port"], fmt.Sprintf("ingress.spec.rules[%d].http.paths[0].backend.service.port", i))
		if got := numberAsInt(t, servicePort["number"], "ingress backend service port"); got != port {
			t.Fatalf("Ingress backend for host %s port = %d, want %d", host, got, port)
		}
		return
	}
	t.Fatalf("missing Ingress rule for host %s", host)
}

func assertEntryPointTarget(t *testing.T, targets []interface{}, host string, port int) {
	t.Helper()
	for i, target := range targets {
		targetMap := asMap(t, target, fmt.Sprintf("entrypoint.spec.targets[%d]", i))
		if targetMap["platformDomain"] != host {
			continue
		}
		if got := numberAsInt(t, targetMap["port"], "entrypoint target port"); got != port {
			t.Fatalf("EntryPoint target %s port = %d, want %d", host, got, port)
		}
		if got := targetMap["status"]; got != "accessible" {
			t.Fatalf("EntryPoint target %s status = %v, want accessible", host, got)
		}
		return
	}
	t.Fatalf("missing EntryPoint target for host %s", host)
}

func assertEntryPointTargetByID(t *testing.T, targets []interface{}, id string, host string, port int) {
	t.Helper()
	for i, target := range targets {
		targetMap := asMap(t, target, fmt.Sprintf("entrypoint.spec.targets[%d]", i))
		if targetMap["id"] != id {
			continue
		}
		if got := targetMap["platformDomain"]; got != host {
			t.Fatalf("EntryPoint target %s platformDomain = %v, want %s", id, got, host)
		}
		if got := numberAsInt(t, targetMap["port"], "entrypoint target port"); got != port {
			t.Fatalf("EntryPoint target %s port = %d, want %d", id, got, port)
		}
		if got := targetMap["status"]; got != "accessible" {
			t.Fatalf("EntryPoint target %s status = %v, want accessible", id, got)
		}
		return
	}
	t.Fatalf("missing EntryPoint target for id %s", id)
}

func assertStatusPublicAddress(t *testing.T, addresses []interface{}, host string, url string, port int) {
	t.Helper()
	for i, address := range addresses {
		addressMap := asMap(t, address, fmt.Sprintf("ap.status.network.publicAddresses[%d]", i))
		if addressMap["host"] != host {
			continue
		}
		if got := addressMap["url"]; got != url {
			t.Fatalf("status public address %s url = %v, want %s", host, got, url)
		}
		if got := numberAsInt(t, addressMap["port"], "status public address port"); got != port {
			t.Fatalf("status public address %s port = %d, want %d", host, got, port)
		}
		if got := addressMap["type"]; got != "platform" {
			t.Fatalf("status public address %s type = %v, want platform", host, got)
		}
		if got := addressMap["status"]; got != "accessible" {
			t.Fatalf("status public address %s status = %v, want accessible", host, got)
		}
		return
	}
	t.Fatalf("missing status public address for host %s", host)
}

func assertStatusPublicAddressByID(t *testing.T, addresses []interface{}, id string, host string, url string, port int) {
	t.Helper()
	for i, address := range addresses {
		addressMap := asMap(t, address, fmt.Sprintf("ap.status.network.publicAddresses[%d]", i))
		if addressMap["id"] != id {
			continue
		}
		if got := addressMap["host"]; got != host {
			t.Fatalf("status public address %s host = %v, want %s", id, got, host)
		}
		if got := addressMap["url"]; got != url {
			t.Fatalf("status public address %s url = %v, want %s", id, got, url)
		}
		if got := numberAsInt(t, addressMap["port"], "status public address port"); got != port {
			t.Fatalf("status public address %s port = %d, want %d", id, got, port)
		}
		if got := addressMap["type"]; got != "platform" {
			t.Fatalf("status public address %s type = %v, want platform", id, got)
		}
		if got := addressMap["status"]; got != "accessible" {
			t.Fatalf("status public address %s status = %v, want accessible", id, got)
		}
		return
	}
	t.Fatalf("missing status public address for id %s", id)
}

func platformHost(namespace string, name string, uid string, id string, domain string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s/%s/%s/%s", namespace, name, uid, id)))
	return fmt.Sprintf("%s-%x.%s", name, sum[:5], domain)
}

func numberAsInt(t *testing.T, value interface{}, path string) int {
	t.Helper()
	switch v := value.(type) {
	case int:
		return v
	case float64:
		return int(v)
	default:
		t.Fatalf("%s is %T, want number", path, value)
		return 0
	}
}

func xrdSpecProperties(t *testing.T, doc map[string]interface{}) map[string]interface{} {
	t.Helper()
	rootProps := xrdOpenAPIProperties(t, doc)
	specSchema := asMap(t, rootProps["spec"], "openAPIV3Schema.properties.spec")
	return asMap(t, specSchema["properties"], "openAPIV3Schema.properties.spec.properties")
}

func xrdStatusProperties(t *testing.T, doc map[string]interface{}) map[string]interface{} {
	t.Helper()
	rootProps := xrdOpenAPIProperties(t, doc)
	statusSchema := asMap(t, rootProps["status"], "openAPIV3Schema.properties.status")
	return asMap(t, statusSchema["properties"], "openAPIV3Schema.properties.status.properties")
}

func xrdOpenAPIProperties(t *testing.T, doc map[string]interface{}) map[string]interface{} {
	t.Helper()
	spec := asMap(t, doc["spec"], "spec")
	versions := asSlice(t, spec["versions"], "spec.versions")
	if len(versions) == 0 {
		t.Fatal("spec.versions is empty")
	}
	version := asMap(t, versions[0], "spec.versions[0]")
	schema := asMap(t, version["schema"], "spec.versions[0].schema")
	openAPI := asMap(t, schema["openAPIV3Schema"], "openAPIV3Schema")
	return asMap(t, openAPI["properties"], "openAPIV3Schema.properties")
}

func compositionTemplate(t *testing.T, path string) string {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read composition %s: %v", path, err)
	}
	var doc map[string]interface{}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse composition %s: %v", path, err)
	}
	spec := asMap(t, doc["spec"], "spec")
	pipeline := asSlice(t, spec["pipeline"], "spec.pipeline")
	if len(pipeline) == 0 {
		t.Fatal("spec.pipeline is empty")
	}
	step := asMap(t, pipeline[0], "spec.pipeline[0]")
	input := asMap(t, step["input"], "spec.pipeline[0].input")
	inline := asMap(t, input["inline"], "spec.pipeline[0].input.inline")
	template, ok := inline["template"].(string)
	if !ok {
		t.Fatal("spec.pipeline[0].input.inline.template is not a string")
	}
	return template
}

func asMap(t *testing.T, value interface{}, path string) map[string]interface{} {
	t.Helper()
	m, ok := value.(map[string]interface{})
	if !ok {
		t.Fatalf("%s is %T, want map[string]interface{}", path, value)
	}
	return m
}

func asSlice(t *testing.T, value interface{}, path string) []interface{} {
	t.Helper()
	s, ok := value.([]interface{})
	if !ok {
		t.Fatalf("%s is %T, want []interface{}", path, value)
	}
	return s
}
