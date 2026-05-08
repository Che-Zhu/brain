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

package env

import (
	"os"
	"strconv"
	"strings"

	"github.com/clidey/whodb/core/src/common"
)

var IsDevelopment = os.Getenv("ENVIRONMENT") == "dev"
var IsEnterpriseEdition = false // Set at startup by the entry point

// ActiveDatabases lists database type names available in this build (populated from registered plugins at startup).
var ActiveDatabases []string

var Tokens = common.FilterList(strings.Split(os.Getenv("WHODB_TOKENS"), ","), func(item string) bool {
	return item != ""
})
var IsAPIGatewayEnabled = len(Tokens) > 0

var AllowedOrigins = common.FilterList(strings.Split(os.Getenv("WHODB_ALLOWED_ORIGINS"), ","), func(item string) bool {
	return item != ""
})

var LogLevel = os.Getenv("WHODB_LOG_LEVEL")

var AccessLogFile = os.Getenv("WHODB_ACCESS_LOG_FILE") // where to store the http access logs
var LogFile = os.Getenv("WHODB_LOG_FILE")              // where to store all other non-http logs
var LogFormat = os.Getenv("WHODB_LOG_FORMAT")          // only option right now is "json". leave blank for default format

// Default log paths used when the AccessLogFile and LogFile vars are set to "default".
const DefaultLogDir = "/var/log/whodb"
const DefaultLogFile = DefaultLogDir + "/whodb.log"
const DefaultAccessLogFile = DefaultLogDir + "/whodb.access.log"

// GetDisableUpdateCheck returns true if update checking is disabled.
func GetDisableUpdateCheck() bool {
	return os.Getenv("WHODB_DISABLE_UPDATE_CHECK") == "true"
}

var ApplicationEnvironment = os.Getenv("WHODB_APPLICATION_ENVIRONMENT")

var ApplicationVersion string

var PosthogAPIKey = "phc_hbXcCoPTdxm5ADL8PmLSYTIUvS6oRWFM2JAK8SMbfnH"
var PosthogHost = "https://us.i.posthog.com"

// IsAWSProviderEnabled controls whether AWS provider functionality is available.
// disabled by default for now until official release
var IsAWSProviderEnabled = os.Getenv("WHODB_ENABLE_AWS_PROVIDER") == "true"

// IsAzureProviderEnabled controls whether Azure provider functionality is available.
var IsAzureProviderEnabled = os.Getenv("WHODB_ENABLE_AZURE_PROVIDER") == "true"

// IsGCPProviderEnabled controls whether GCP provider functionality is available.
var IsGCPProviderEnabled = os.Getenv("WHODB_ENABLE_GCP_PROVIDER") == "true"

// IsNewUIEnabled controls whether the new UI visuals are available.
var IsNewUIEnabled = os.Getenv("WHODB_ENABLE_NEW_UI") == "true"

// DisableCredentialForm controls whether the credential form is disabled.
var DisableCredentialForm = os.Getenv("WHODB_DISABLE_CREDENTIAL_FORM") == "true"

var BridgeURL = os.Getenv("WHODB_BRIDGE_URL")

// MaxPageSize is the maximum number of rows that can be requested in a single
// page via the Row resolver. Configurable via WHODB_MAX_PAGE_SIZE (default 10000).
var MaxPageSize = getMaxPageSize()

func getMaxPageSize() int {
	val := os.Getenv("WHODB_MAX_PAGE_SIZE")
	if val == "" {
		return 10000
	}
	n, err := strconv.Atoi(val)
	if err != nil || n <= 0 {
		return 10000
	}
	return n
}
