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
	customDomainItem := asMap(t, customDomains["items"], "spec.customDomains.items")
	customDomainRequired := asSlice(t, customDomainItem["required"], "spec.customDomains.items.required")
	for _, field := range []string{"id", "domain", "platformAddressId", "targetPort", "cnameTarget"} {
		assertStringSliceContains(t, customDomainRequired, field)
	}
	customDomainProps := asMap(t, customDomainItem["properties"], "spec.customDomains.items.properties")
	for _, field := range []string{"id", "domain", "platformAddressId", "targetPort", "cnameTarget"} {
		if _, ok := customDomainProps[field]; !ok {
			t.Fatalf("spec.customDomains.items.%s is missing", field)
		}
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
	statusCustomDomains := asMap(t, statusProps["customDomains"], "status.customDomains")
	if got := statusCustomDomains["type"]; got != "array" {
		t.Fatalf("status.customDomains type = %v, want array", got)
	}
	statusCustomDomainProps := asMap(
		t,
		asMap(t, statusCustomDomains["items"], "status.customDomains.items")["properties"],
		"status.customDomains.items.properties",
	)
	for _, field := range []string{
		"id",
		"domain",
		"platformAddressId",
		"targetPort",
		"cnameTarget",
		"status",
		"dns",
		"certificate",
		"routing",
	} {
		if _, ok := statusCustomDomainProps[field]; !ok {
			t.Fatalf("status.customDomains.items.%s is missing", field)
		}
	}
	statusEnum := asSlice(t, asMap(t, statusCustomDomainProps["status"], "status.customDomains.items.status")["enum"], "status.customDomains.items.status.enum")
	for _, value := range []string{"pending", "verifying", "accessible", "blocked"} {
		assertStringSliceContains(t, statusEnum, value)
	}
	dnsProps := asMap(t, asMap(t, statusCustomDomainProps["dns"], "status.customDomains.items.dns")["properties"], "status.customDomains.items.dns.properties")
	dnsStatusEnum := asSlice(t, asMap(t, dnsProps["status"], "status.customDomains.items.dns.status")["enum"], "status.customDomains.items.dns.status.enum")
	for _, value := range []string{"pending", "verified", "unknown", "blocked"} {
		assertStringSliceContains(t, dnsStatusEnum, value)
	}
	certificateProps := asMap(t, asMap(t, statusCustomDomainProps["certificate"], "status.customDomains.items.certificate")["properties"], "status.customDomains.items.certificate.properties")
	certificateStatusEnum := asSlice(t, asMap(t, certificateProps["status"], "status.customDomains.items.certificate.status")["enum"], "status.customDomains.items.certificate.status.enum")
	for _, value := range []string{"pending", "ready", "failed", "unknown"} {
		assertStringSliceContains(t, certificateStatusEnum, value)
	}
	routingProps := asMap(t, asMap(t, statusCustomDomainProps["routing"], "status.customDomains.items.routing")["properties"], "status.customDomains.items.routing.properties")
	routingStatusEnum := asSlice(t, asMap(t, routingProps["status"], "status.customDomains.items.routing.status")["enum"], "status.customDomains.items.routing.status.enum")
	for _, value := range []string{"pending", "configured", "blocked"} {
		assertStringSliceContains(t, routingStatusEnum, value)
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

	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(interface{}, string) map[string]interface{} {
		return nil
	}
	if _, err := template.New("entrypoints-minimal").Funcs(funcs).Parse(templateText); err != nil {
		t.Fatalf("parse EntryPoint composition template: %v", err)
	}
}

func TestEntryPointCompositionRendersCustomDomainRoutingAndTLS(t *testing.T) {
	out := renderEntryPointComposition(t, entryPointResource(map[string]interface{}{
		"apRef": "web",
		"targets": []interface{}{
			map[string]interface{}{
				"id":             "pa_abc123",
				"port":           8080,
				"platformDomain": "web.example.platform",
				"status":         "accessible",
			},
		},
		"customDomains": []interface{}{
			map[string]interface{}{
				"id":                "cd_def456",
				"domain":            "www.example.com",
				"platformAddressId": "pa_abc123",
				"targetPort":        8080,
				"cnameTarget":       "web.example.platform",
			},
			map[string]interface{}{
				"id":                "cd_admin9",
				"domain":            "admin.example.com",
				"platformAddressId": "pa_admin9",
				"targetPort":        9000,
				"cnameTarget":       "admin.example.platform",
			},
		},
	}), nil)

	ingresses := ingressObjects(t, out)
	if got := len(ingresses); got != 2 {
		t.Fatalf("Custom Domain Ingress count = %d, want 2", got)
	}
	issuers := kindObjects(t, out, func(obj map[string]interface{}) bool {
		return obj["kind"] == "Issuer"
	})
	if got := len(issuers); got != 2 {
		t.Fatalf("Custom Domain Issuer count = %d, want 2", got)
	}
	certificates := kindObjects(t, out, func(obj map[string]interface{}) bool {
		return obj["kind"] == "Certificate"
	})
	if got := len(certificates); got != 2 {
		t.Fatalf("Custom Domain Certificate count = %d, want 2", got)
	}

	ingress := objectByName(t, ingresses, "web-cd-def456")
	ingressSpec := asMap(t, ingress["spec"], "custom domain ingress.spec")
	assertIngressBackend(t, asSlice(t, ingressSpec["rules"], "custom domain ingress.spec.rules"), "www.example.com", "web-service", 8080)
	tls := asMap(t, asSlice(t, ingressSpec["tls"], "custom domain ingress.spec.tls")[0], "custom domain ingress.spec.tls[0]")
	assertStringSliceContains(t, asSlice(t, tls["hosts"], "custom domain ingress.spec.tls[0].hosts"), "www.example.com")
	if got := tls["secretName"]; got != "web-cd-def456-tls" {
		t.Fatalf("custom domain ingress tls secretName = %v, want web-cd-def456-tls", got)
	}

	issuer := objectByName(t, issuers, "web-cd-def456")
	issuerSpec := asMap(t, issuer["spec"], "custom domain issuer.spec")
	acme := asMap(t, issuerSpec["acme"], "custom domain issuer.spec.acme")
	if got := acme["server"]; got != "https://acme-v02.api.letsencrypt.org/directory" {
		t.Fatalf("custom domain issuer ACME server = %v, want Let's Encrypt production", got)
	}

	certificate := objectByName(t, certificates, "web-cd-def456")
	certificateSpec := asMap(t, certificate["spec"], "custom domain certificate.spec")
	if got := certificateSpec["secretName"]; got != "web-cd-def456-tls" {
		t.Fatalf("custom domain certificate secretName = %v, want web-cd-def456-tls", got)
	}
	assertStringSliceContains(t, asSlice(t, certificateSpec["dnsNames"], "custom domain certificate.spec.dnsNames"), "www.example.com")
	issuerRef := asMap(t, certificateSpec["issuerRef"], "custom domain certificate.spec.issuerRef")
	if got := issuerRef["name"]; got != "web-cd-def456" {
		t.Fatalf("custom domain certificate issuerRef.name = %v, want web-cd-def456", got)
	}
}

func TestEntryPointCompositionProjectsCustomDomainHealthFromCertificateAndIngress(t *testing.T) {
	out := renderEntryPointComposition(t, entryPointResource(map[string]interface{}{
		"apRef": "web",
		"targets": []interface{}{
			map[string]interface{}{
				"id":             "pa_abc123",
				"port":           8080,
				"platformDomain": "web.example.platform",
				"status":         "accessible",
			},
		},
		"customDomains": []interface{}{
			map[string]interface{}{
				"id":                "cd_def456",
				"domain":            "www.example.com",
				"platformAddressId": "pa_abc123",
				"targetPort":        8080,
				"cnameTarget":       "web.example.platform",
			},
		},
	}), map[string]map[string]interface{}{
		"custom-domain-ingress-cd-def456": observedIngress("www.example.com", "web-service", 8080, "web-cd-def456-tls"),
		"custom-domain-certificate-cd-def456": observedCertificate(
			"web-cd-def456-tls",
			"www.example.com",
			"IssuerReady",
			"Certificate is up to date and has not expired",
			"True",
		),
	})

	status := asMap(t, singleKindObject(t, out, "EntryPoint")["status"], "entrypoint.status")
	if got := status["phase"]; got != "Accessible" {
		t.Fatalf("EntryPoint phase = %v, want Accessible", got)
	}
	customDomains := asSlice(t, status["customDomains"], "entrypoint.status.customDomains")
	binding := customDomainStatusByID(t, customDomains, "cd_def456")
	if got := binding["status"]; got != "accessible" {
		t.Fatalf("custom domain status = %v, want accessible", got)
	}
	dns := asMap(t, binding["dns"], "custom domain dns detail")
	if got := dns["status"]; got != "verified" {
		t.Fatalf("custom domain dns status = %v, want verified", got)
	}
	if got := dns["reason"]; got != "SubmitVerified" {
		t.Fatalf("custom domain dns reason = %v, want SubmitVerified", got)
	}
	certificate := asMap(t, binding["certificate"], "custom domain certificate detail")
	if got := certificate["status"]; got != "ready" {
		t.Fatalf("custom domain certificate status = %v, want ready", got)
	}
	if got := certificate["reason"]; got != "IssuerReady" {
		t.Fatalf("custom domain certificate reason = %v, want cert-manager reason", got)
	}
	routing := asMap(t, binding["routing"], "custom domain routing detail")
	if got := routing["status"]; got != "configured" {
		t.Fatalf("custom domain routing status = %v, want configured", got)
	}
	if got := routing["reason"]; got != "IngressConfigured" {
		t.Fatalf("custom domain routing reason = %v, want IngressConfigured", got)
	}
}

func TestEntryPointCompositionKeepsCustomDomainPendingUntilRoutingObserved(t *testing.T) {
	out := renderEntryPointComposition(t, entryPointResource(map[string]interface{}{
		"apRef": "web",
		"targets": []interface{}{
			map[string]interface{}{
				"id":             "pa_abc123",
				"port":           8080,
				"platformDomain": "web.example.platform",
				"status":         "accessible",
			},
		},
		"customDomains": []interface{}{
			map[string]interface{}{
				"id":                "cd_def456",
				"domain":            "www.example.com",
				"platformAddressId": "pa_abc123",
				"targetPort":        8080,
				"cnameTarget":       "web.example.platform",
			},
		},
	}), nil)

	status := asMap(t, singleKindObject(t, out, "EntryPoint")["status"], "entrypoint.status")
	if got := status["phase"]; got != "Progressing" {
		t.Fatalf("EntryPoint phase = %v, want Progressing while Custom Domain Binding is pending", got)
	}
	binding := customDomainStatusByID(t, asSlice(t, status["customDomains"], "entrypoint.status.customDomains"), "cd_def456")
	if got := binding["status"]; got != "pending" {
		t.Fatalf("custom domain status = %v, want pending", got)
	}
	routing := asMap(t, binding["routing"], "custom domain routing detail")
	if got := routing["status"]; got != "pending" {
		t.Fatalf("custom domain routing status = %v, want pending", got)
	}
}

func TestEntryPointCompositionBlocksCustomDomainOnCertificateFailure(t *testing.T) {
	out := renderEntryPointComposition(t, entryPointResource(map[string]interface{}{
		"apRef": "web",
		"targets": []interface{}{
			map[string]interface{}{
				"id":             "pa_abc123",
				"port":           8080,
				"platformDomain": "web.example.platform",
				"status":         "accessible",
			},
		},
		"customDomains": []interface{}{
			map[string]interface{}{
				"id":                "cd_def456",
				"domain":            "www.example.com",
				"platformAddressId": "pa_abc123",
				"targetPort":        8080,
				"cnameTarget":       "web.example.platform",
			},
		},
	}), map[string]map[string]interface{}{
		"custom-domain-ingress-cd-def456": observedIngress("www.example.com", "web-service", 8080, "web-cd-def456-tls"),
		"custom-domain-certificate-cd-def456": observedCertificate(
			"web-cd-def456-tls",
			"www.example.com",
			"Failed",
			"DNS name is not allowed",
			"False",
		),
	})

	status := asMap(t, singleKindObject(t, out, "EntryPoint")["status"], "entrypoint.status")
	if got := status["phase"]; got != "Inaccessible" {
		t.Fatalf("EntryPoint phase = %v, want Inaccessible", got)
	}
	binding := customDomainStatusByID(t, asSlice(t, status["customDomains"], "entrypoint.status.customDomains"), "cd_def456")
	if got := binding["status"]; got != "blocked" {
		t.Fatalf("custom domain status = %v, want blocked", got)
	}
	certificate := asMap(t, binding["certificate"], "custom domain certificate detail")
	if got := certificate["status"]; got != "failed" {
		t.Fatalf("custom domain certificate status = %v, want failed", got)
	}
	if got := certificate["reason"]; got != "Failed" {
		t.Fatalf("custom domain certificate reason = %v, want Failed", got)
	}
	routing := asMap(t, binding["routing"], "custom domain routing detail")
	if got := routing["status"]; got != "configured" {
		t.Fatalf("custom domain routing status = %v, want configured", got)
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

	webHost := platformHost("project-a", "web", "pa_web001", "usw.sealos.app")
	apiHost := platformHost("project-a", "web", "pa_api001", "usw.sealos.app")
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

func TestAPCompositionIgnoresInactiveElasticBranchForFixedReplicaStrategy(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"resource": map[string]interface{}{
						"replicaStrategy": map[string]interface{}{
							"type": "fixed",
							"fixed": map[string]interface{}{
								"replicas": 5,
							},
							"elastic": map[string]interface{}{
								"minReplicas": 2,
								"maxReplicas": 9,
								"target": map[string]interface{}{
									"metric":             "cpu",
									"type":               "utilization",
									"utilizationPercent": 70,
								},
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

	deployment := singleKindObject(t, out, "Deployment")
	deploymentSpec := asMap(t, deployment["spec"], "deployment.spec")
	if got := numberAsInt(t, deploymentSpec["replicas"], "deployment.spec.replicas"); got != 5 {
		t.Fatalf("Deployment replicas = %d, want active fixed replicas 5", got)
	}
	if got := kindObjects(t, out, func(obj map[string]interface{}) bool {
		return obj["kind"] == "HorizontalPodAutoscaler"
	}); len(got) != 0 {
		t.Fatalf("HPA manifest count = %d, want 0 for inactive elastic branch", len(got))
	}
	configMap := singleKindObject(t, out, "ConfigMap")
	data := asMap(t, configMap["data"], "configmap.data")
	configYaml, ok := data["config.yaml"].(string)
	if !ok {
		t.Fatalf("config.yaml is %T, want string", data["config.yaml"])
	}
	if strings.Contains(configYaml, "minReplicas: 2") ||
		strings.Contains(configYaml, "maxReplicas: 9") ||
		strings.Contains(configYaml, "utilizationPercent: 70") {
		t.Fatalf("effective config reconciled inactive elastic settings:\n%s", configYaml)
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

func TestAPCompositionRendersCPUElasticReplicaStrategy(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"resource": map[string]interface{}{
						"replicaStrategy": map[string]interface{}{
							"type": "elastic",
							"fixed": map[string]interface{}{
								"replicas": 4,
							},
							"elastic": map[string]interface{}{
								"minReplicas": 2,
								"maxReplicas": 8,
								"target": map[string]interface{}{
									"metric":             "cpu",
									"type":               "utilization",
									"utilizationPercent": 75,
								},
							},
						},
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
	if _, ok := deploymentSpec["replicas"]; ok {
		t.Fatal("Deployment spec.replicas should be omitted so the HPA controls elastic replicas")
	}
	deploymentAnnotations := asMap(t, asMap(t, deployment["metadata"], "deployment.metadata")["annotations"], "deployment.metadata.annotations")
	if _, ok := deploymentAnnotations["deploy.cloud.sealos.io/minReplicas"]; ok {
		t.Fatal("Deployment should not carry fixed minReplicas annotation in elastic mode")
	}
	if _, ok := deploymentAnnotations["deploy.cloud.sealos.io/maxReplicas"]; ok {
		t.Fatal("Deployment should not carry fixed maxReplicas annotation in elastic mode")
	}

	hpa := singleKindObject(t, out, "HorizontalPodAutoscaler")
	metadata := asMap(t, hpa["metadata"], "hpa.metadata")
	if got := metadata["name"]; got != "web" {
		t.Fatalf("HPA metadata.name = %v, want web", got)
	}
	annotations := asMap(t, metadata["annotations"], "hpa.metadata.annotations")
	if got := annotations["gotemplating.fn.crossplane.io/composition-resource-name"]; got != "app-horizontal-pod-autoscaler" {
		t.Fatalf("HPA composition resource name = %v, want app-horizontal-pod-autoscaler", got)
	}
	ownerReferences := asSlice(t, metadata["ownerReferences"], "hpa.metadata.ownerReferences")
	owner := asMap(t, ownerReferences[0], "hpa.metadata.ownerReferences[0]")
	if got := owner["kind"]; got != "AP" {
		t.Fatalf("HPA owner kind = %v, want AP", got)
	}

	hpaSpec := asMap(t, hpa["spec"], "hpa.spec")
	if got := numberAsInt(t, hpaSpec["minReplicas"], "hpa.spec.minReplicas"); got != 2 {
		t.Fatalf("HPA minReplicas = %d, want 2", got)
	}
	if got := numberAsInt(t, hpaSpec["maxReplicas"], "hpa.spec.maxReplicas"); got != 8 {
		t.Fatalf("HPA maxReplicas = %d, want 8", got)
	}
	scaleTargetRef := asMap(t, hpaSpec["scaleTargetRef"], "hpa.spec.scaleTargetRef")
	if got := scaleTargetRef["kind"]; got != "Deployment" {
		t.Fatalf("HPA scale target kind = %v, want Deployment", got)
	}
	if got := scaleTargetRef["name"]; got != "web" {
		t.Fatalf("HPA scale target name = %v, want web", got)
	}
	metrics := asSlice(t, hpaSpec["metrics"], "hpa.spec.metrics")
	metric := asMap(t, metrics[0], "hpa.spec.metrics[0]")
	resourceMetric := asMap(t, metric["resource"], "hpa.spec.metrics[0].resource")
	if got := resourceMetric["name"]; got != "cpu" {
		t.Fatalf("HPA resource metric name = %v, want cpu", got)
	}
	target := asMap(t, resourceMetric["target"], "hpa.spec.metrics[0].resource.target")
	if got := target["type"]; got != "Utilization" {
		t.Fatalf("HPA target type = %v, want Utilization", got)
	}
	if got := numberAsInt(t, target["averageUtilization"], "hpa target averageUtilization"); got != 75 {
		t.Fatalf("HPA averageUtilization = %d, want 75", got)
	}

	configMap := singleKindObject(t, out, "ConfigMap")
	configData := asMap(t, configMap["data"], "configmap.data")
	configYaml, ok := configData["config.yaml"].(string)
	if !ok {
		t.Fatalf("config.yaml is %T, want string", configData["config.yaml"])
	}
	if !strings.Contains(configYaml, "type: elastic") ||
		!strings.Contains(configYaml, "replicas: 4") ||
		!strings.Contains(configYaml, "minReplicas: 2") ||
		!strings.Contains(configYaml, "maxReplicas: 8") ||
		!strings.Contains(configYaml, "utilizationPercent: 75") {
		t.Fatalf("effective config did not include canonical elastic replica strategy:\n%s", configYaml)
	}
}

func TestAPCompositionRendersMemoryElasticReplicaStrategy(t *testing.T) {
	data := map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"resource": map[string]interface{}{
						"replicaStrategy": map[string]interface{}{
							"type": "elastic",
							"fixed": map[string]interface{}{
								"replicas": 4,
							},
							"elastic": map[string]interface{}{
								"minReplicas": 2,
								"maxReplicas": 8,
								"target": map[string]interface{}{
									"metric":       "memory",
									"type":         "averageValue",
									"averageValue": "512Mi",
								},
							},
						},
						"replicas": 3,
					},
				}, map[string]interface{}{
					"region": "usw.sealos.app",
				}),
			},
		},
	}
	composed := map[string]map[string]interface{}{
		"app-deployment": runningDeployment(),
	}
	out := renderAPComposition(t, data, composed)

	deployment := singleKindObject(t, out, "Deployment")
	deploymentSpec := asMap(t, deployment["spec"], "deployment.spec")
	if _, ok := deploymentSpec["replicas"]; ok {
		t.Fatal("Deployment spec.replicas should be omitted so the HPA controls elastic replicas")
	}

	hpa := singleKindObject(t, out, "HorizontalPodAutoscaler")
	hpaSpec := asMap(t, hpa["spec"], "hpa.spec")
	if got := numberAsInt(t, hpaSpec["minReplicas"], "hpa.spec.minReplicas"); got != 2 {
		t.Fatalf("HPA minReplicas = %d, want 2", got)
	}
	if got := numberAsInt(t, hpaSpec["maxReplicas"], "hpa.spec.maxReplicas"); got != 8 {
		t.Fatalf("HPA maxReplicas = %d, want 8", got)
	}
	metrics := asSlice(t, hpaSpec["metrics"], "hpa.spec.metrics")
	metric := asMap(t, metrics[0], "hpa.spec.metrics[0]")
	resourceMetric := asMap(t, metric["resource"], "hpa.spec.metrics[0].resource")
	if got := resourceMetric["name"]; got != "memory" {
		t.Fatalf("HPA resource metric name = %v, want memory", got)
	}
	target := asMap(t, resourceMetric["target"], "hpa.spec.metrics[0].resource.target")
	if got := target["type"]; got != "AverageValue" {
		t.Fatalf("HPA target type = %v, want AverageValue", got)
	}
	if got := target["averageValue"]; got != "512Mi" {
		t.Fatalf("HPA averageValue = %v, want 512Mi", got)
	}
	if _, ok := target["averageUtilization"]; ok {
		t.Fatal("HPA memory target should not include averageUtilization")
	}

	configMap := singleKindObject(t, out, "ConfigMap")
	configData := asMap(t, configMap["data"], "configmap.data")
	configYaml, ok := configData["config.yaml"].(string)
	if !ok {
		t.Fatalf("config.yaml is %T, want string", configData["config.yaml"])
	}
	if !strings.Contains(configYaml, "type: elastic") ||
		!strings.Contains(configYaml, "replicas: 4") ||
		!strings.Contains(configYaml, "minReplicas: 2") ||
		!strings.Contains(configYaml, "maxReplicas: 8") ||
		!strings.Contains(configYaml, "metric: memory") ||
		!strings.Contains(configYaml, "type: averageValue") ||
		!strings.Contains(configYaml, "averageValue: 512Mi") {
		t.Fatalf("effective config did not include canonical memory elastic replica strategy:\n%s", configYaml)
	}

	configHash := effectiveConfigHash(configYaml)
	configMapMetadata := asMap(t, configMap["metadata"], "configmap.metadata")
	configMapAnnotations := asMap(
		t,
		configMapMetadata["annotations"],
		"configmap.metadata.annotations",
	)
	if got := configMapAnnotations["app.sealos.io/config-version-hash"]; got != configHash {
		t.Fatalf("config map version hash = %v, want %s", got, configHash)
	}

	rbacOut := renderAPCompositionStep(t, data, composed, 1)
	role := singleKindObject(t, rbacOut, "Role")
	roleMetadata := asMap(t, role["metadata"], "snapshot role.metadata")
	if got := roleMetadata["name"]; got != fmt.Sprintf("web-config-snapshot-%s", configHash) {
		t.Fatalf("snapshot role name = %v, want hash %s", got, configHash)
	}
	jobOut := renderAPCompositionStep(t, data, composed, 2)
	job := singleKindObject(t, jobOut, "Job")
	jobMetadata := asMap(t, job["metadata"], "snapshot job.metadata")
	if got := jobMetadata["name"]; got != fmt.Sprintf("web-config-snapshot-%s", configHash) {
		t.Fatalf("snapshot job name = %v, want hash %s", got, configHash)
	}
}

func TestAPCompositionRendersPublicAddressesFromNetworkContract(t *testing.T) {
	apiHost := platformHost("project-a", "web", "pa_abc123", "usw.sealos.app")
	apiAltHost := platformHost("project-a", "web", "pa_def456", "usw.sealos.app")
	adminHost := platformHost("project-a", "web", "pa_admin9", "usw.sealos.app")
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
						platformHost("project-a", "web", "pa_abc123", "usw.sealos.app"),
						platformHost("project-a", "web", "pa_def456", "usw.sealos.app"),
						platformHost("project-a", "web", "pa_admin9", "usw.sealos.app"),
					}},
				},
			},
		},
	})

	apiHost := platformHost("project-a", "web", "pa_abc123", "usw.sealos.app")
	apiAltHost := platformHost("project-a", "web", "pa_def456", "usw.sealos.app")
	adminHost := platformHost("project-a", "web", "pa_admin9", "usw.sealos.app")

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

func TestAPCompositionPromotesCustomDomainsIntoEntryPointTasks(t *testing.T) {
	apiHost := platformHost("project-a", "web", "pa_abc123", "usw.sealos.app")
	adminHost := platformHost("project-a", "web", "pa_admin9", "usw.sealos.app")
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"network": map[string]interface{}{
							"privatePort": 8080,
							"platformAddresses": []interface{}{
								map[string]interface{}{"id": "pa_abc123", "port": 8080},
								map[string]interface{}{"id": "pa_admin9", "port": 9000},
							},
							"customDomains": []interface{}{
								map[string]interface{}{
									"id":                "cd_def456",
									"domain":            "www.example.com",
									"platformAddressId": "pa_abc123",
								},
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

	entryPoint := manifestFromObject(t, singleEntryPointObject(t, out), "entrypoint object")
	entryPointSpec := asMap(t, entryPoint["spec"], "entrypoint.spec")
	targets := asSlice(t, entryPointSpec["targets"], "entrypoint.spec.targets")
	assertEntryPointTargetByID(t, targets, "pa_abc123", apiHost, 8080)
	assertEntryPointTargetByID(t, targets, "pa_admin9", adminHost, 9000)
	customDomains := asSlice(t, entryPointSpec["customDomains"], "entrypoint.spec.customDomains")
	assertEntryPointCustomDomainTask(t, customDomains, "cd_def456", "www.example.com", "pa_abc123", 8080, apiHost)

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	network := asMap(t, status["network"], "ap.status.network")
	publicAddresses := asSlice(t, network["publicAddresses"], "ap.status.network.publicAddresses")
	assertStatusCustomDomainAddress(t, publicAddresses, "cd_def456", "www.example.com", "pa_abc123", apiHost, 8080)
	assertStatusPublicAddressByID(t, publicAddresses, "pa_admin9", adminHost, fmt.Sprintf("http://%s/", adminHost), 9000)
	assertStatusPublicAddressIDMissing(t, publicAddresses, "pa_abc123")
}

func TestAPWorkloadPhaseIgnoresEntryPointCustomDomainFailures(t *testing.T) {
	out := renderAPComposition(t, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": apResource(map[string]interface{}{
					"input": map[string]interface{}{
						"network": map[string]interface{}{
							"privatePort": 8080,
							"platformAddresses": []interface{}{
								map[string]interface{}{"id": "pa_abc123", "port": 8080},
							},
							"customDomains": []interface{}{
								map[string]interface{}{
									"id":                "cd_def456",
									"domain":            "www.example.com",
									"platformAddressId": "pa_abc123",
								},
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
		"app-entrypoint": {
			"status": map[string]interface{}{
				"customDomains": []interface{}{
					map[string]interface{}{
						"id":     "cd_def456",
						"status": "blocked",
						"certificate": map[string]interface{}{
							"status": "failed",
							"reason": "Failed",
						},
						"routing": map[string]interface{}{
							"status": "blocked",
							"reason": "IngressMisconfigured",
						},
					},
				},
			},
		},
	})

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	if got := status["phase"]; got != "Running" {
		t.Fatalf("AP status.phase = %v, want Running despite blocked Custom Domain Binding", got)
	}
}

func TestAPCompositionPlatformAddressHostIgnoresUIDAndTargetPort(t *testing.T) {
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
						"uid":       "different-ap-uid",
					},
					"spec": map[string]interface{}{
						"input": map[string]interface{}{
							"image": "nginx:1.27",
							"network": map[string]interface{}{
								"privatePort": 8080,
								"platformAddresses": []interface{}{
									map[string]interface{}{"id": "pa_abc123", "port": 9000},
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

	host := platformHost("project-a", "web", "pa_abc123", "usw.sealos.app")
	if forbidden := platformHostWithUIDAndPort("project-a", "web", "different-ap-uid", "pa_abc123", 9000, "usw.sealos.app"); forbidden == host {
		t.Fatal("test fixture should distinguish forbidden UID/port-based host")
	}

	entryPoint := manifestFromObject(t, singleEntryPointObject(t, out), "entrypoint object")
	entryPointSpec := asMap(t, entryPoint["spec"], "entrypoint.spec")
	entryPointTargets := asSlice(t, entryPointSpec["targets"], "entrypoint.spec.targets")
	assertEntryPointTargetByID(t, entryPointTargets, "pa_abc123", host, 9000)

	status := asMap(t, singleKindObject(t, out, "AP")["status"], "ap.status")
	network := asMap(t, status["network"], "ap.status.network")
	publicAddresses := asSlice(t, network["publicAddresses"], "ap.status.network.publicAddresses")
	assertStatusPublicAddressByID(t, publicAddresses, "pa_abc123", host, fmt.Sprintf("http://%s/", host), 9000)
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

func entryPointResource(spec map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"metadata": map[string]interface{}{
			"name":      "web",
			"namespace": "project-a",
			"uid":       "entrypoint-uid-1",
		},
		"spec": spec,
	}
}

func renderEntryPointComposition(
	t *testing.T,
	entryPoint map[string]interface{},
	composed map[string]map[string]interface{},
) string {
	t.Helper()
	if composed == nil {
		composed = map[string]map[string]interface{}{}
	}
	templateText := compositionTemplate(t, filepath.Join(repoRoot(t), "packages/crossplane/public/service/entrypoint/entrypoints-minimal-composition.yaml"))
	funcs := sprig.TxtFuncMap()
	funcs["getComposedResource"] = func(_ interface{}, name string) map[string]interface{} {
		return composed[name]
	}
	tpl, err := template.New("entrypoints-minimal").Funcs(funcs).Parse(templateText)
	if err != nil {
		t.Fatalf("parse EntryPoint composition template: %v", err)
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, map[string]interface{}{
		"observed": map[string]interface{}{
			"composite": map[string]interface{}{
				"resource": entryPoint,
			},
		},
	}); err != nil {
		t.Fatalf("execute EntryPoint composition template: %v", err)
	}
	return buf.String()
}

func observedIngress(host string, serviceName string, port int, secretName string) map[string]interface{} {
	return map[string]interface{}{
		"spec": map[string]interface{}{
			"rules": []interface{}{
				ingressRule(host, serviceName, port),
			},
			"tls": []interface{}{
				map[string]interface{}{
					"hosts":      []interface{}{host},
					"secretName": secretName,
				},
			},
		},
	}
}

func observedCertificate(secretName string, dnsName string, reason string, message string, readyStatus string) map[string]interface{} {
	return map[string]interface{}{
		"spec": map[string]interface{}{
			"secretName": secretName,
			"dnsNames":   []interface{}{dnsName},
		},
		"status": map[string]interface{}{
			"conditions": []interface{}{
				map[string]interface{}{
					"type":    "Ready",
					"status":  readyStatus,
					"reason":  reason,
					"message": message,
				},
			},
		},
	}
}

func renderAPComposition(t *testing.T, data map[string]interface{}, composed map[string]map[string]interface{}) string {
	t.Helper()
	return renderAPCompositionStep(t, data, composed, 0)
}

func renderAPCompositionStep(
	t *testing.T,
	data map[string]interface{},
	composed map[string]map[string]interface{},
	stepIndex int,
) string {
	t.Helper()
	templateText := compositionStepTemplate(
		t,
		filepath.Join(repoRoot(t), "packages/crossplane/public/service/ap/deployments/aps-deployment-ingress-go-templating.yaml"),
		stepIndex,
	)
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

func objectByName(t *testing.T, objects []map[string]interface{}, name string) map[string]interface{} {
	t.Helper()
	for _, obj := range objects {
		metadata := asMap(t, obj["metadata"], fmt.Sprintf("%s.metadata", obj["kind"]))
		if metadata["name"] == name {
			return obj
		}
	}
	t.Fatalf("missing object named %s", name)
	return nil
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

func assertEntryPointCustomDomainTask(t *testing.T, tasks []interface{}, id string, domain string, platformAddressID string, targetPort int, cnameTarget string) {
	t.Helper()
	for i, task := range tasks {
		taskMap := asMap(t, task, fmt.Sprintf("entrypoint.spec.customDomains[%d]", i))
		if taskMap["id"] != id {
			continue
		}
		if got := taskMap["domain"]; got != domain {
			t.Fatalf("EntryPoint Custom Domain task %s domain = %v, want %s", id, got, domain)
		}
		if got := taskMap["platformAddressId"]; got != platformAddressID {
			t.Fatalf("EntryPoint Custom Domain task %s platformAddressId = %v, want %s", id, got, platformAddressID)
		}
		if got := numberAsInt(t, taskMap["targetPort"], "entrypoint custom domain task targetPort"); got != targetPort {
			t.Fatalf("EntryPoint Custom Domain task %s targetPort = %d, want %d", id, got, targetPort)
		}
		if got := taskMap["cnameTarget"]; got != cnameTarget {
			t.Fatalf("EntryPoint Custom Domain task %s cnameTarget = %v, want %s", id, got, cnameTarget)
		}
		return
	}
	t.Fatalf("missing EntryPoint Custom Domain task for id %s", id)
}

func customDomainStatusByID(t *testing.T, statuses []interface{}, id string) map[string]interface{} {
	t.Helper()
	for i, status := range statuses {
		statusMap := asMap(t, status, fmt.Sprintf("entrypoint.status.customDomains[%d]", i))
		if statusMap["id"] == id {
			return statusMap
		}
	}
	t.Fatalf("missing EntryPoint Custom Domain status for id %s", id)
	return nil
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

func assertStatusCustomDomainAddress(t *testing.T, addresses []interface{}, id string, domain string, platformAddressID string, cnameTarget string, port int) {
	t.Helper()
	for i, address := range addresses {
		addressMap := asMap(t, address, fmt.Sprintf("ap.status.network.publicAddresses[%d]", i))
		if addressMap["id"] != id {
			continue
		}
		if got := addressMap["host"]; got != domain {
			t.Fatalf("status custom domain %s host = %v, want %s", id, got, domain)
		}
		if got := addressMap["url"]; got != fmt.Sprintf("https://%s/", domain) {
			t.Fatalf("status custom domain %s url = %v, want host URL", id, got)
		}
		if got := addressMap["platformAddressId"]; got != platformAddressID {
			t.Fatalf("status custom domain %s platformAddressId = %v, want %s", id, got, platformAddressID)
		}
		if got := addressMap["cnameTarget"]; got != cnameTarget {
			t.Fatalf("status custom domain %s cnameTarget = %v, want %s", id, got, cnameTarget)
		}
		if got := numberAsInt(t, addressMap["port"], "status custom domain port"); got != port {
			t.Fatalf("status custom domain %s port = %d, want %d", id, got, port)
		}
		if got := addressMap["type"]; got != "custom" {
			t.Fatalf("status custom domain %s type = %v, want custom", id, got)
		}
		if got := addressMap["status"]; got != "pending" {
			t.Fatalf("status custom domain %s status = %v, want pending", id, got)
		}
		return
	}
	t.Fatalf("missing status custom domain for id %s", id)
}

func assertStatusPublicAddressIDMissing(t *testing.T, addresses []interface{}, id string) {
	t.Helper()
	for i, address := range addresses {
		addressMap := asMap(t, address, fmt.Sprintf("ap.status.network.publicAddresses[%d]", i))
		if addressMap["id"] == id {
			t.Fatalf("status public address id %s should be hidden after Custom Domain promotion", id)
		}
	}
}

func platformHost(namespace string, name string, id string, domain string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s/%s/%s", namespace, name, id)))
	return fmt.Sprintf("%s-%x.%s", name, sum[:5], domain)
}

func platformHostWithUIDAndPort(namespace string, name string, uid string, id string, port int, domain string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s/%s/%s/%s/%d", namespace, name, uid, id, port)))
	return fmt.Sprintf("%s-%x.%s", name, sum[:5], domain)
}

func effectiveConfigHash(configYaml string) string {
	configYaml = strings.TrimPrefix(configYaml, "\n")
	if !strings.HasSuffix(configYaml, "\n") {
		configYaml += "\n"
	}
	sum := sha256.Sum256([]byte(configYaml))
	return fmt.Sprintf("%x", sum)[:12]
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
	return compositionStepTemplate(t, path, 0)
}

func compositionStepTemplate(t *testing.T, path string, stepIndex int) string {
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
	if stepIndex < 0 || stepIndex >= len(pipeline) {
		t.Fatalf("spec.pipeline[%d] is out of range", stepIndex)
	}
	step := asMap(
		t,
		pipeline[stepIndex],
		fmt.Sprintf("spec.pipeline[%d]", stepIndex),
	)
	input := asMap(
		t,
		step["input"],
		fmt.Sprintf("spec.pipeline[%d].input", stepIndex),
	)
	inline := asMap(
		t,
		input["inline"],
		fmt.Sprintf("spec.pipeline[%d].input.inline", stepIndex),
	)
	template, ok := inline["template"].(string)
	if !ok {
		t.Fatalf("spec.pipeline[%d].input.inline.template is not a string", stepIndex)
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

func assertStringSliceContains(t *testing.T, values []interface{}, want string) {
	t.Helper()
	for _, value := range values {
		if value == want {
			return
		}
	}
	t.Fatalf("%v does not contain %q", values, want)
}
