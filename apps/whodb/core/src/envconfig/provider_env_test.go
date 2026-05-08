package envconfig

import "testing"

func TestGetCloudProvidersFromEnvApplyDefaults(t *testing.T) {
	t.Setenv("WHODB_AWS_PROVIDER", `[{"name":"AWS One","region":"us-west-2","authMethod":"default"}]`)
	awsConfigs, err := GetAWSProvidersFromEnv()
	if err != nil {
		t.Fatalf("expected AWS provider env config to parse, got %v", err)
	}
	if len(awsConfigs) != 1 || awsConfigs[0].DiscoverRDS == nil || !*awsConfigs[0].DiscoverRDS || awsConfigs[0].DiscoverElastiCache == nil || !*awsConfigs[0].DiscoverElastiCache || awsConfigs[0].DiscoverDocumentDB == nil || !*awsConfigs[0].DiscoverDocumentDB {
		t.Fatalf("expected AWS provider discovery flags to default to true, got %#v", awsConfigs)
	}

	t.Setenv("WHODB_AZURE_PROVIDER", `[{"name":"Azure One","subscriptionId":"sub-123","authMethod":"default"}]`)
	azureConfigs, err := GetAzureProvidersFromEnv()
	if err != nil {
		t.Fatalf("expected Azure provider env config to parse, got %v", err)
	}
	if len(azureConfigs) != 1 || azureConfigs[0].DiscoverPostgreSQL == nil || !*azureConfigs[0].DiscoverPostgreSQL || azureConfigs[0].DiscoverMySQL == nil || !*azureConfigs[0].DiscoverMySQL || azureConfigs[0].DiscoverRedis == nil || !*azureConfigs[0].DiscoverRedis || azureConfigs[0].DiscoverCosmosDB == nil || !*azureConfigs[0].DiscoverCosmosDB {
		t.Fatalf("expected Azure provider discovery flags to default to true, got %#v", azureConfigs)
	}

	t.Setenv("WHODB_GCP_PROVIDER", `[{"name":"GCP One","projectId":"project-123","region":"us-central1"}]`)
	gcpConfigs, err := GetGCPProvidersFromEnv()
	if err != nil {
		t.Fatalf("expected GCP provider env config to parse, got %v", err)
	}
	if len(gcpConfigs) != 1 || gcpConfigs[0].DiscoverCloudSQL == nil || !*gcpConfigs[0].DiscoverCloudSQL || gcpConfigs[0].DiscoverAlloyDB == nil || !*gcpConfigs[0].DiscoverAlloyDB || gcpConfigs[0].DiscoverMemorystore == nil || !*gcpConfigs[0].DiscoverMemorystore {
		t.Fatalf("expected GCP provider discovery flags to default to true, got %#v", gcpConfigs)
	}
}

func TestGetCloudProvidersFromEnvRejectInvalidJSON(t *testing.T) {
	t.Setenv("WHODB_AWS_PROVIDER", `{`)
	if _, err := GetAWSProvidersFromEnv(); err == nil {
		t.Fatal("expected invalid AWS provider JSON to return an error")
	}

	t.Setenv("WHODB_AZURE_PROVIDER", `{`)
	if _, err := GetAzureProvidersFromEnv(); err == nil {
		t.Fatal("expected invalid Azure provider JSON to return an error")
	}

	t.Setenv("WHODB_GCP_PROVIDER", `{`)
	if _, err := GetGCPProvidersFromEnv(); err == nil {
		t.Fatal("expected invalid GCP provider JSON to return an error")
	}
}

func TestGetDefaultDatabaseCredentialsHandlesInvalidEnvPayloads(t *testing.T) {
	t.Setenv("WHODB_POSTGRES", `{`)
	if creds := GetDefaultDatabaseCredentials("postgres"); creds != nil {
		t.Fatalf("expected invalid JSON payload to return nil credentials, got %#v", creds)
	}

	t.Setenv("WHODB_MYSQL", "")
	t.Setenv("WHODB_MYSQL_1", `{"host":"mysql.local","user":"alice","database":"app"}`)
	t.Setenv("WHODB_MYSQL_2", `{`)

	creds := GetDefaultDatabaseCredentials("mysql")
	if len(creds) != 1 || creds[0].Hostname != "mysql.local" {
		t.Fatalf("expected numbered fallback parsing to stop after invalid payload, got %#v", creds)
	}
}
