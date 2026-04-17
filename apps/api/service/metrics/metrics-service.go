package metrics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"

	"sealos/api/middleware"
)

// DBType represents a supported database type for telemetry.
type DBType string

const (
	DBMySQL    DBType = "mysql"
	DBPostgres DBType = "postgres"
	DBRedis    DBType = "redis"
	DBMongo    DBType = "mongo"
)

// MetricKind represents a supported metric type for telemetry.
type MetricKind string

const (
	MetricCPU    MetricKind = "cpu"
	MetricMemory MetricKind = "memory"
	MetricDisk   MetricKind = "disk"
	MetricUptime MetricKind = "upTime"
)

// DBMetricQueries holds the PromQL / VM select queries for each database and metric kind.
// The placeholders `#` and `@` are kept from the original implementation and can be
// replaced by the caller (e.g. namespace, instance name).
var DBMetricQueries = map[DBType]map[MetricKind]string{
	DBMySQL: {
		MetricCPU:    "round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"#\",pod=~\"@-mysql-\\\\d\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"#\",pod=~\"@-mysql-\\\\d\"}) by (pod)*100,0.01)",
		MetricMemory: "round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"#\",container!=\"\", image!=\"\",pod=~\"@-mysql-\\\\d\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"#\", pod=~\"@-mysql-\\\\d\"}) by (pod) * 100, 0.01)",
		MetricDisk:   "round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-mysql-\\\\d\"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-mysql-\\\\d\"})) * 100, 0.01)",
		MetricUptime: "sum(mysql_global_status_uptime{namespace=~\"#\", app_kubernetes_io_instance=~\"@\"}) by (namespace,app_kubernetes_io_instance,pod)",
	},
	DBPostgres: {
		MetricCPU:    "round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"#\",pod=~\"@-postgresql-\\\\d\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"#\",pod=~\"@-postgresql-\\\\d\"}) by (pod)*100,0.01)",
		MetricMemory: "round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"#\",container!=\"\", image!=\"\",pod=~\"@-postgresql-\\\\d\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"#\", pod=~\"@-postgresql-\\\\d\"}) by (pod) * 100, 0.01)",
		MetricDisk:   "round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-postgresql-\\\\d\"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-postgresql-\\\\d\"})) * 100, 0.01)",
		MetricUptime: "avg (time() - pg_postmaster_start_time_seconds{namespace=~\"#\", app_kubernetes_io_instance=~\"@\"}) by(namespace, app_kubernetes_io_instance, pod)",
	},
	DBMongo: {
		MetricCPU:    "round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"#\",pod=~\"@-mongodb-\\\\d\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"#\",pod=~\"@-mongodb-\\\\d\"}) by (pod)*100,0.01)",
		MetricMemory: "round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"#\",container!=\"\", image!=\"\",pod=~\"@-mongodb-\\\\d\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"#\", pod=~\"@-mongodb-\\\\d\"}) by (pod) * 100, 0.01)",
		MetricDisk:   "round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-mongodb-\\\\d\"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-mongodb-\\\\d\"})) * 100, 0.01)",
		MetricUptime: "sum by(namespace, app_kubernetes_io_instance, pod) (mongodb_instance_uptime_seconds{namespace=~\"#\", app_kubernetes_io_instance=~\"@\"})",
	},
	DBRedis: {
		MetricCPU:    "round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"#\",pod=~\"@-redis-\\\\d\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"#\",pod=~\"@-redis-\\\\d\"}) by (pod)*100,0.01)",
		MetricMemory: "round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"#\",container!=\"\", image!=\"\",pod=~\"@-redis-\\\\d\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"#\", pod=~\"@-redis-\\\\d\"}) by (pod) * 100, 0.01)",
		MetricDisk:   "round((max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_used_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-redis-\\\\d\"})) / (max by (persistentvolumeclaim,namespace) (kubelet_volume_stats_capacity_bytes {namespace=~\"#\", persistentvolumeclaim=~\"data-@-redis-\\\\d\"})) * 100, 0.01)",
		MetricUptime: "redis_uptime_in_seconds{namespace=~\"#\", app_kubernetes_io_instance=~\"@\"}",
	},
}

var (
	ErrNoVMHost        = errors.New("unable to get the victoria-metrics host")
	ErrNoPromHost      = errors.New("unable to get the prometheus host")
	ErrUncompleteParam = errors.New("at least provide both namespace and query")
	ErrEmptyKubeconfig = errors.New("empty kubeconfig")
	ErrNilNs           = errors.New("namespace not found")
	ErrInvalidKind     = errors.New("invalid metrics kind")
	ErrClusterNotFound = errors.New("cluster not found")
	ErrUnsupportedDef  = errors.New("unsupported cluster definition")
)

// APMetricType represents supported AP (application) metric types.
type APMetricType string

const (
	APMetricCPU    APMetricType = "cpu"
	APMetricMemory APMetricType = "memory"
)

// APMetricKinds returns all supported AP metric types.
func APMetricKinds() []APMetricType {
	return []APMetricType{APMetricCPU, APMetricMemory}
}

// APMetricQuery builds a PromQL query for AP metrics.
func APMetricQuery(metricType APMetricType, namespace string, name string) (string, error) {
	if namespace == "" || name == "" {
		return "", ErrUncompleteParam
	}
	podName := apGetPodName(name)
	var template string
	switch metricType {
	case APMetricCPU:
		template = "round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod) * 100,0.01)"
	case APMetricMemory:
		template = "round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"$namespace\",pod=~\"$pod.*\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod)* 100, 0.01)"
	default:
		return "", fmt.Errorf("unsupported AP metric type: %s", metricType)
	}
	result := strings.ReplaceAll(template, "$namespace", namespace)
	result = strings.ReplaceAll(result, "$pod", podName)
	return result, nil
}

// DBTypeFromLabel maps KubeBlocks clusterdefinition label to DBType.
// Label values: redis, postgresql, apecloud-mysql, mongodb.
func DBTypeFromLabel(label string) (DBType, bool) {
	switch strings.ToLower(label) {
	case "redis":
		return DBRedis, true
	case "postgresql":
		return DBPostgres, true
	case "apecloud-mysql":
		return DBMySQL, true
	case "mongodb":
		return DBMongo, true
	default:
		return "", false
	}
}

// DBMetricKinds returns all supported DB metric kinds.
func DBMetricKinds() []MetricKind {
	return []MetricKind{MetricCPU, MetricMemory, MetricDisk, MetricUptime}
}

// BuildDBQueries renders all DB metric queries for a namespace/resource name.
func BuildDBQueries(dbType DBType, namespace string, name string) (map[string]string, error) {
	if namespace == "" || name == "" {
		return nil, ErrUncompleteParam
	}
	dbMap, ok := DBMetricQueries[dbType]
	if !ok {
		return nil, fmt.Errorf("unsupported db type: %s", dbType)
	}
	out := make(map[string]string, len(dbMap))
	for metricKind, tpl := range dbMap {
		query := strings.ReplaceAll(tpl, "#", namespace)
		query = strings.ReplaceAll(query, "@", name)
		out[string(metricKind)] = query
	}
	return out, nil
}

// BuildAPQueries renders all AP metric queries for a namespace/resource name.
func BuildAPQueries(namespace string, name string) (map[string]string, error) {
	out := make(map[string]string, len(APMetricKinds()))
	for _, mk := range APMetricKinds() {
		query, err := APMetricQuery(mk, namespace, name)
		if err != nil {
			return nil, err
		}
		out[string(mk)] = query
	}
	return out, nil
}

// apGetPodName derives the pod prefix by stripping the last "-" suffix.
func apGetPodName(name string) string {
	idx := strings.LastIndex(name, "-")
	if idx <= 0 {
		return name
	}
	return name[:idx]
}

// ----- Range query orchestration -----

const (
	clusterDefLabel   = "clusterdefinition.kubeblocks.io/name"
	defaultRangeHours = 6
	defaultRangeStep  = "5m"
)

var clusterGVR = schema.GroupVersionResource{
	Group:    "apps.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "clusters",
}

// RangeMetrics queries VictoriaMetrics for all metrics of a given resource.
// kind must be "db" or "ap".
func RangeMetrics(ctx context.Context, auth, kind, namespace, name string) (map[string]json.RawMessage, error) {
	kind = strings.ToLower(strings.TrimSpace(kind))
	if kind != "db" && kind != "ap" {
		return nil, ErrInvalidKind
	}

	vmBase, err := queryRangeEndpointFromEnv()
	if err != nil {
		return nil, err
	}

	queries, err := buildQueriesForKind(ctx, auth, kind, namespace, name)
	if err != nil {
		return nil, err
	}

	start, end := defaultRangeUnix()
	return executeRangeQueries(ctx, vmBase, queries, start, end, defaultRangeStep)
}

func queryRangeEndpointFromEnv() (string, error) {
	vmURL := os.Getenv("VMSELECT_URL")
	if vmURL == "" {
		return "", ErrNoVMHost
	}
	if strings.Contains(vmURL, "/api/v1/query_range") {
		return vmURL, nil
	}
	if strings.Contains(vmURL, "/api/v1/query") {
		return strings.Replace(vmURL, "/api/v1/query", "/api/v1/query_range", 1), nil
	}
	return strings.TrimRight(vmURL, "/") + "/api/v1/query_range", nil
}

func defaultRangeUnix() (string, string) {
	now := time.Now().UTC()
	end := strconv.FormatInt(now.Unix(), 10)
	start := strconv.FormatInt(now.Add(-defaultRangeHours*time.Hour).Unix(), 10)
	return start, end
}

func buildQueriesForKind(ctx context.Context, auth, kind, namespace, name string) (map[string]string, error) {
	switch kind {
	case "db":
		dbType, err := resolveDBTypeFromClusterLabel(ctx, auth, namespace, name)
		if err != nil {
			return nil, err
		}
		return BuildDBQueries(dbType, namespace, name)
	case "ap":
		return BuildAPQueries(namespace, name)
	default:
		return nil, ErrInvalidKind
	}
}

func resolveDBTypeFromClusterLabel(ctx context.Context, auth, namespace, name string) (DBType, error) {
	restConfig, _, err := middleware.RestConfigFromAuth(auth)
	if err != nil {
		return "", err
	}
	dyn, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return "", err
	}
	obj, err := dyn.Resource(clusterGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", ErrClusterNotFound
	}

	labelVal := obj.GetLabels()[clusterDefLabel]
	if labelVal == "" {
		return "", ErrUnsupportedDef
	}
	dbType, ok := DBTypeFromLabel(labelVal)
	if !ok {
		return "", ErrUnsupportedDef
	}
	return dbType, nil
}

func executeRangeQueries(ctx context.Context, baseURL string, queries map[string]string, start, end, step string) (map[string]json.RawMessage, error) {
	result := make(map[string]json.RawMessage, len(queries))
	client := &http.Client{Timeout: 20 * time.Second}

	var (
		mu       sync.Mutex
		wg       sync.WaitGroup
		firstErr error
	)

	for metricName, query := range queries {
		wg.Add(1)
		go func(name, q string) {
			defer wg.Done()
			u, err := url.Parse(baseURL)
			if err != nil {
				setFirstErr(&mu, &firstErr, err)
				return
			}
			values := u.Query()
			values.Set("query", q)
			values.Set("start", start)
			values.Set("end", end)
			values.Set("step", step)
			u.RawQuery = values.Encode()

			req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
			if err != nil {
				setFirstErr(&mu, &firstErr, err)
				return
			}
			resp, err := client.Do(req)
			if err != nil {
				setFirstErr(&mu, &firstErr, err)
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				setFirstErr(&mu, &firstErr, fmt.Errorf("VictoriaMetrics returned %s", resp.Status))
				return
			}

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				setFirstErr(&mu, &firstErr, err)
				return
			}
			mu.Lock()
			result[name] = body
			mu.Unlock()
		}(metricName, query)
	}

	wg.Wait()
	if firstErr != nil {
		return nil, firstErr
	}
	return result, nil
}

func setFirstErr(mu *sync.Mutex, target *error, err error) {
	if err == nil {
		return
	}
	mu.Lock()
	defer mu.Unlock()
	if *target == nil {
		*target = err
	}
}

