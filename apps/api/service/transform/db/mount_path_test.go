package db

import "testing"

func TestDBWithSecretsAndBackupsPreservesMountPathWithoutAddingFallback(t *testing.T) {
	db := map[string]interface{}{
		"spec": map[string]interface{}{"engine": "postgresql"},
		"status": map[string]interface{}{
			"mountPath": "/custom/data",
		},
	}

	got := DBWithSecretsAndBackupsFromList(db, nil, nil)
	status, ok := got["status"].(map[string]interface{})
	if !ok {
		t.Fatalf("status is %T, want map", got["status"])
	}
	if status["mountPath"] != "/custom/data" {
		t.Fatalf("mountPath = %q, want existing status value", status["mountPath"])
	}

	dbWithoutMountPath := map[string]interface{}{
		"spec":   map[string]interface{}{"engine": "mysql"},
		"status": map[string]interface{}{},
	}
	got = DBWithSecretsAndBackupsFromList(dbWithoutMountPath, nil, nil)
	status, ok = got["status"].(map[string]interface{})
	if !ok {
		t.Fatalf("status is %T, want map", got["status"])
	}
	if _, ok := status["mountPath"]; ok {
		t.Fatalf("mountPath = %q, want missing when status does not provide it", status["mountPath"])
	}
}
