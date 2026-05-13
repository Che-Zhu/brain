package regiontoken

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"

	"sealos/api/middleware"
)

const (
	ingressNamespace = "sealos"
	ingressName      = "sealos-desktop"
	upstreamPath     = "/api/auth/regionToken"
	httpTimeout      = 45 * time.Second
)

// SEALOS_DESKTOP_SKIP_TLS_VERIFY=1 disables TLS certificate verification for the
// outbound GET to sealos-desktop /api/auth/regionToken (staging / private CA clusters only).
func desktopUpstreamSkipTLSVerify() bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv("SEALOS_DESKTOP_SKIP_TLS_VERIFY")))
	return v == "1" || v == "true" || v == "yes"
}

func exchangeHTTPClient() *http.Client {
	if !desktopUpstreamSkipTLSVerify() {
		return &http.Client{Timeout: httpTimeout}
	}
	t := http.DefaultTransport.(*http.Transport).Clone()
	if t.TLSClientConfig == nil {
		t.TLSClientConfig = &tls.Config{}
	}
	t.TLSClientConfig.InsecureSkipVerify = true
	return &http.Client{Timeout: httpTimeout, Transport: t}
}

// unescapeKubeconfigLiterals turns literal backslash escape sequences into runes.
// The desktop ingress sometimes returns YAML where newlines were serialized as the
// two characters '\' and 'n' inside the JSON string (after json.Unmarshal, that is
// still not a newline). Real newlines are unchanged.
func unescapeKubeconfigLiterals(s string) string {
	return strings.NewReplacer(
		`\n`, "\n",
		`\r`, "\r",
		`\t`, "\t",
	).Replace(s)
}

// UpstreamResponse matches the JSON returned by the Sealos desktop /api/auth/regionToken route.
type UpstreamResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data struct {
		Kubeconfig string `json:"kubeconfig"`
	} `json:"data"`
}

// ExchangeResult is returned to API clients: URL-encoded kubeconfig and namespace from the parsed kubeconfig.
type ExchangeResult struct {
	EncodedKubeconfig string
	Namespace         string
}

func firstIngressHost(ing *networkingv1.Ingress) string {
	for _, r := range ing.Spec.Rules {
		if h := strings.TrimSpace(r.Host); h != "" {
			return h
		}
	}
	for _, addr := range ing.Status.LoadBalancer.Ingress {
		if h := strings.TrimSpace(addr.Hostname); h != "" {
			return h
		}
		if h := strings.TrimSpace(addr.IP); h != "" {
			return h
		}
	}
	return ""
}

// SealosDesktopBaseURL fetches the sealos-desktop Ingress in namespace sealos (admin kubeconfig) and
// returns https://<host> (no trailing slash).
func SealosDesktopBaseURL(ctx context.Context) (string, error) {
	apiCfg, err := middleware.AdminKubeconfigFromEnv()
	if err != nil {
		return "", err
	}
	restCfg, err := clientcmd.NewDefaultClientConfig(*apiCfg, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return "", fmt.Errorf("admin kubeconfig: %w", err)
	}
	middleware.SuppressK8sRESTWarnings(restCfg)
	clientset, err := kubernetes.NewForConfig(restCfg)
	if err != nil {
		return "", err
	}
	ing, err := clientset.NetworkingV1().Ingresses(ingressNamespace).Get(ctx, ingressName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ingress %s/%s: %w", ingressNamespace, ingressName, err)
	}
	host := firstIngressHost(ing)
	if host == "" {
		return "", fmt.Errorf("ingress %s/%s has no usable host in spec.rules or status.loadBalancer", ingressNamespace, ingressName)
	}
	// Do not use url.URL for host: may be IP; ensure single colon for port if ever present
	if strings.Contains(host, "://") {
		return strings.TrimRight(host, "/"), nil
	}
	return "https://" + strings.TrimRight(host, "/"), nil
}

// Exchange calls the upstream regionToken endpoint and returns URL-encoded kubeconfig and namespace.
func Exchange(ctx context.Context, baseURL, regionToken string) (*ExchangeResult, error) {
	regionToken = strings.TrimSpace(regionToken)
	if regionToken == "" {
		return nil, fmt.Errorf("regionToken is empty")
	}
	u, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil {
		return nil, err
	}
	if u.Scheme == "" {
		u, err = url.Parse("https://" + strings.TrimPrefix(strings.TrimSpace(baseURL), "https://"))
		if err != nil {
			return nil, err
		}
	}
	uStr := strings.TrimRight(u.String(), "/") + upstreamPath

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, uStr, nil)
	if err != nil {
		return nil, err
	}
	// Upstream matches browser/clients: raw JWT in Authorization (no "Bearer" prefix)
	req.Header.Set("Authorization", regionToken)

	client := exchangeHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("upstream %s: status %d: %s", uStr, resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed UpstreamResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("decode upstream JSON: %w", err)
	}
	if parsed.Code != 200 {
		return nil, fmt.Errorf("upstream error: code=%d message=%s", parsed.Code, parsed.Message)
	}
	kc := strings.TrimSpace(unescapeKubeconfigLiterals(parsed.Data.Kubeconfig))
	if kc == "" {
		return nil, fmt.Errorf("upstream response: empty data.kubeconfig")
	}

	kubeAPI, err := clientcmd.Load([]byte(kc))
	if err != nil {
		return nil, fmt.Errorf("parse kubeconfig from upstream: %w", err)
	}
	cc := kubeAPI.CurrentContext
	ns := ""
	if cc != "" {
		if cx := kubeAPI.Contexts[cc]; cx != nil {
			ns = strings.TrimSpace(cx.Namespace)
		}
	}
	// QueryEscape uses '+' for space (form-style). Clients expect percent-encoding with '%20' for spaces; QueryUnescape accepts both.
	enc := strings.ReplaceAll(url.QueryEscape(kc), "+", "%20")

	return &ExchangeResult{
		EncodedKubeconfig: enc,
		Namespace:         ns,
	}, nil
}
