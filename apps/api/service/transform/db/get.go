package db

import (
	"encoding/base64"
	"net/url"
	"sort"
	"strings"
)

// DBInstanceLabel is the label key used to find secrets for a DB instance.
const DBInstanceLabel = "app.kubernetes.io/instance"

// KubeBlocksBackupClusterUIDLabel is the label on Backup resources that references the KubeBlocks Cluster UID.
const KubeBlocksBackupClusterUIDLabel = "dataprotection.kubeblocks.io/cluster-uid"

// DBWithSecretsFromList takes a DB resource (as raw map) and a list of secrets,
// merges them into status.secrets, builds status.variables from the chosen secret,
// and returns the modified DB object.
func DBWithSecretsFromList(db map[string]interface{}, secrets []map[string]interface{}) map[string]interface{} {
	return DBWithSecretsAndBackupsFromList(db, secrets, nil)
}

// DBWithSecretsAndBackupsFromList sets status.secrets from the given secret list (when non-empty),
// builds status.variables from the chosen secret, and sets status.backups when backups is non-empty.
func DBWithSecretsAndBackupsFromList(db map[string]interface{}, secrets []map[string]interface{}, backups []map[string]interface{}) map[string]interface{} {
	if db == nil {
		return nil
	}
	// Shallow copy to avoid mutating the original
	out := make(map[string]interface{})
	for k, v := range db {
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
	statusCopy["secrets"] = secrets
	statusCopy["variables"] = buildVariablesFromSecrets(db, secrets)
	if len(backups) > 0 {
		statusCopy["backups"] = backups
	}
	out["status"] = statusCopy

	return out
}

// buildVariablesFromSecrets builds env-style variables from the shortest-named secret.
// For each key in secret.data, creates {ENGINE}_{KEY} with valueFrom.secretKeyRef.
// Adds a composed connection string (e.g. DATABASE_URL) when the engine supports it.
func buildVariablesFromSecrets(db map[string]interface{}, secrets []map[string]interface{}) []map[string]interface{} {
	if len(secrets) == 0 {
		return nil
	}
	secret := pickShortestSecret(secrets)
	if secret == nil {
		return nil
	}
	secretData := getSecretData(secret)
	if len(secretData) == 0 {
		return nil
	}
	secretName := getSecretName(secret)
	engine := getDBEngine(db)
	enginePrefix := toEnvPrefix(engine)
	decodedData := decodeSecretData(secret)

	keys := make([]string, 0, len(secretData))
	for k := range secretData {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	preferredOrder := []string{"host", "endpoint", "port", "username", "user", "password", "passwd"}
	orderedKeys := orderKeys(keys, preferredOrder)

	vars := make([]map[string]interface{}, 0, len(secretData)+1)
	for _, key := range orderedKeys {
		varName := enginePrefix + "_" + toEnvKey(key)
		if secretName != "" {
			vars = append(vars, map[string]interface{}{
				"name": varName,
				"valueFrom": map[string]interface{}{
					"secretKeyRef": map[string]interface{}{
						"key":  key,
						"name": secretName,
					},
				},
			})
			continue
		}
		if value, ok := decodedData[key]; ok && value != "" {
			vars = append(vars, map[string]interface{}{
				"name":  varName,
				"value": value,
			})
		}
	}

	connStr := buildConnectionStringResolved(engine, decodedData)
	if connStr != "" {
		vars = append(vars, map[string]interface{}{
			"name":  enginePrefix + "_URL",
			"value": connStr,
		})
	}
	return vars
}

func pickShortestSecret(secrets []map[string]interface{}) map[string]interface{} {
	var shortest map[string]interface{}
	shortestLen := -1
	var fallback map[string]interface{}
	for _, s := range secrets {
		if fallback == nil && len(getSecretData(s)) > 0 {
			fallback = s
		}
		name := getSecretName(s)
		if name == "" {
			continue
		}
		if shortestLen < 0 || len(name) < shortestLen {
			shortest = s
			shortestLen = len(name)
		}
	}
	if shortest == nil {
		return fallback
	}
	return shortest
}

func getSecretName(secret map[string]interface{}) string {
	meta, _ := secret["metadata"].(map[string]interface{})
	if meta == nil {
		return ""
	}
	name, _ := meta["name"].(string)
	return name
}

func getSecretData(secret map[string]interface{}) map[string]interface{} {
	data, _ := secret["data"].(map[string]interface{})
	if data != nil {
		return data
	}
	stringData, _ := secret["stringData"].(map[string]interface{})
	return stringData
}

// decodeSecretData returns a map of decoded string values from secret.data (base64) or secret.stringData (plain).
func decodeSecretData(secret map[string]interface{}) map[string]string {
	out := make(map[string]string)
	data, hasData := secret["data"].(map[string]interface{})
	stringData, hasStringData := secret["stringData"].(map[string]interface{})

	if hasData && data != nil {
		for k, v := range data {
			if s, ok := v.(string); ok {
				decoded, err := base64.StdEncoding.DecodeString(s)
				if err == nil {
					out[k] = string(decoded)
				} else {
					out[k] = s
				}
			}
		}
	}
	if hasStringData && stringData != nil {
		for k, v := range stringData {
			if s, ok := v.(string); ok {
				out[k] = s
			}
		}
	}
	return out
}

func getDBEngine(db map[string]interface{}) string {
	spec, _ := db["spec"].(map[string]interface{})
	if spec == nil {
		return ""
	}
	if e, ok := spec["engine"].(string); ok && e != "" {
		return e
	}
	if t, ok := spec["type"].(string); ok && t != "" {
		return t
	}
	return ""
}

func toEnvPrefix(engine string) string {
	s := strings.TrimSpace(strings.ToUpper(engine))
	if s == "" {
		return "DB"
	}
	switch {
	case s == "PG" || s == "POSTGRES" || s == "POSTGRESQL":
		return "PG"
	case strings.HasPrefix(s, "MYSQL"):
		return "MYSQL"
	case strings.HasPrefix(s, "MONGO"):
		return "MONGODB"
	case strings.HasPrefix(s, "REDIS"):
		return "REDIS"
	default:
		return s
	}
}

func toEnvKey(key string) string {
	return strings.ToUpper(strings.ReplaceAll(key, "-", "_"))
}

func getDecodedValue(data map[string]string, candidates ...string) string {
	for _, c := range candidates {
		if v, ok := data[c]; ok && v != "" {
			return v
		}
	}
	return ""
}

// buildConnectionStringResolved builds a connection string with resolved (decoded) values from secret data.
func buildConnectionStringResolved(engine string, decodedData map[string]string) string {
	host := getDecodedValue(decodedData, "host", "endpoint")
	port := getDecodedValue(decodedData, "port")
	user := getDecodedValue(decodedData, "username", "user")
	pass := getDecodedValue(decodedData, "password", "passwd")

	hasHost := host != ""
	hasPort := port != ""
	hasUser := user != ""
	hasPass := pass != ""

	switch toEnvPrefix(engine) {
	case "PG":
		if hasUser && hasPass && hasHost && hasPort {
			u := &url.URL{
				Scheme: "postgresql",
				User:   url.UserPassword(user, pass),
				Host:   host + ":" + port,
				Path:   "/",
			}
			return u.String()
		}
	case "MYSQL":
		if hasUser && hasPass && hasHost && hasPort {
			u := &url.URL{
				Scheme: "mysql",
				User:   url.UserPassword(user, pass),
				Host:   host + ":" + port,
				Path:   "/",
			}
			return u.String()
		}
	case "MONGODB":
		if hasUser && hasPass && hasHost && hasPort {
			u := &url.URL{
				Scheme: "mongodb",
				User:   url.UserPassword(user, pass),
				Host:   host + ":" + port,
				Path:   "/",
			}
			return u.String()
		}
	case "REDIS":
		if hasPass && hasHost && hasPort {
			u := &url.URL{
				Scheme: "redis",
				User:   url.UserPassword("", pass),
				Host:   host + ":" + port,
				Path:   "/",
			}
			return u.String()
		}
		if hasHost && hasPort {
			return "redis://" + host + ":" + port + "/"
		}
	}
	return ""
}

func findKey(data map[string]interface{}, candidates ...string) string {
	for _, c := range candidates {
		if _, ok := data[c]; ok {
			return c
		}
	}
	return ""
}

func orderKeys(keys []string, preferred []string) []string {
	seen := make(map[string]bool)
	for _, k := range keys {
		seen[k] = true
	}
	var out []string
	for _, p := range preferred {
		if seen[p] {
			out = append(out, p)
			seen[p] = false
		}
	}
	for _, k := range keys {
		if seen[k] {
			out = append(out, k)
		}
	}
	return out
}
