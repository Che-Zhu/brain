package metrics

import (
	"errors"
	"fmt"
	"os"
	"strings"
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
	ErrUncompleteParam = errors.New("at least provide both namespace and query")
)

// VictoriaMetricsConfigured reports whether the metrics dependency has enough
// configuration for query endpoints to attempt work. It does not perform a live probe.
func VictoriaMetricsConfigured() bool {
	return strings.TrimSpace(os.Getenv("VMSELECT_URL")) != ""
}

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
