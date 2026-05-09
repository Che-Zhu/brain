/*
 * Copyright 2026 Clidey, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Package envconfig provides configuration-loading functions that depend on
// both the env and log packages. It exists to break the circular dependency
// that would occur if env imported log directly.
package envconfig

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/clidey/whodb/core/src/env"
	"github.com/clidey/whodb/core/src/log"
	"github.com/clidey/whodb/core/src/types"
)

// GetDefaultDatabaseCredentials reads database credentials from environment
// variables. It first checks WHODB_<TYPE> for a JSON array, then falls back
// to numbered WHODB_<TYPE>_1, WHODB_<TYPE>_2, etc.
func GetDefaultDatabaseCredentials(databaseType string) []types.DatabaseCredentials {
	uppercaseDatabaseType := strings.ToUpper(databaseType)
	credEnvVar := fmt.Sprintf("WHODB_%s", uppercaseDatabaseType)
	credEnvValue := os.Getenv(credEnvVar)

	if credEnvValue == "" {
		return findAllDatabaseCredentials(databaseType)
	}

	var creds []types.DatabaseCredentials
	err := json.Unmarshal([]byte(credEnvValue), &creds)
	if err != nil {
		log.Error("🔴 [Database Error] Failed to parse database credentials from environment variable! Error: ", err)
		return nil
	}

	return creds
}

func findAllDatabaseCredentials(databaseType string) []types.DatabaseCredentials {
	uppercaseDatabaseType := strings.ToUpper(databaseType)
	i := 1
	var profiles []types.DatabaseCredentials

	for {
		databaseProfile := os.Getenv(fmt.Sprintf("WHODB_%s_%d", uppercaseDatabaseType, i))
		if databaseProfile == "" {
			break
		}

		var creds types.DatabaseCredentials
		err := json.Unmarshal([]byte(databaseProfile), &creds)
		if err != nil {
			log.Error("Unable to parse database credential: ", err)
			break
		}

		profiles = append(profiles, creds)
		i++
	}

	return profiles
}

// GetAWSProvidersFromEnv parses the WHODB_AWS_PROVIDER environment variable
// into a slice of AWS provider configurations, applying defaults.
func GetAWSProvidersFromEnv() ([]env.AWSProviderEnvConfig, error) {
	val := os.Getenv("WHODB_AWS_PROVIDER")
	if val == "" {
		return nil, nil
	}

	var configs []env.AWSProviderEnvConfig
	if err := json.Unmarshal([]byte(val), &configs); err != nil {
		log.Error("[AWS Provider] Failed to parse WHODB_AWS_PROVIDER: ", err)
		return nil, err
	}

	// Apply defaults
	for i := range configs {
		if configs[i].DiscoverRDS == nil {
			t := true
			configs[i].DiscoverRDS = &t
		}
		if configs[i].DiscoverElastiCache == nil {
			t := true
			configs[i].DiscoverElastiCache = &t
		}
		if configs[i].DiscoverDocumentDB == nil {
			t := true
			configs[i].DiscoverDocumentDB = &t
		}
	}

	return configs, nil
}

// GetAzureProvidersFromEnv parses the WHODB_AZURE_PROVIDER environment variable
// into a slice of Azure provider configurations, applying defaults.
func GetAzureProvidersFromEnv() ([]env.AzureProviderEnvConfig, error) {
	val := os.Getenv("WHODB_AZURE_PROVIDER")
	if val == "" {
		return nil, nil
	}

	var configs []env.AzureProviderEnvConfig
	if err := json.Unmarshal([]byte(val), &configs); err != nil {
		log.Error("[Azure Provider] Failed to parse WHODB_AZURE_PROVIDER: ", err)
		return nil, err
	}

	// Apply defaults — all discovery flags default to true
	for i := range configs {
		if configs[i].DiscoverPostgreSQL == nil {
			t := true
			configs[i].DiscoverPostgreSQL = &t
		}
		if configs[i].DiscoverMySQL == nil {
			t := true
			configs[i].DiscoverMySQL = &t
		}
		if configs[i].DiscoverRedis == nil {
			t := true
			configs[i].DiscoverRedis = &t
		}
		if configs[i].DiscoverCosmosDB == nil {
			t := true
			configs[i].DiscoverCosmosDB = &t
		}
	}

	return configs, nil
}

// GetGCPProvidersFromEnv parses the WHODB_GCP_PROVIDER environment variable
// into a slice of GCP provider configurations, applying defaults.
func GetGCPProvidersFromEnv() ([]env.GCPProviderEnvConfig, error) {
	val := os.Getenv("WHODB_GCP_PROVIDER")
	if val == "" {
		return nil, nil
	}

	var configs []env.GCPProviderEnvConfig
	if err := json.Unmarshal([]byte(val), &configs); err != nil {
		log.Error("[GCP Provider] Failed to parse WHODB_GCP_PROVIDER: ", err)
		return nil, err
	}

	// Apply defaults
	for i := range configs {
		if configs[i].DiscoverCloudSQL == nil {
			t := true
			configs[i].DiscoverCloudSQL = &t
		}
		if configs[i].DiscoverAlloyDB == nil {
			t := true
			configs[i].DiscoverAlloyDB = &t
		}
		if configs[i].DiscoverMemorystore == nil {
			t := true
			configs[i].DiscoverMemorystore = &t
		}
	}

	return configs, nil
}
