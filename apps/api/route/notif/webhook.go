package notif

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"

	"sealos/api/middleware"
	k8ssvc "sealos/api/service/k8s"
)

func registerWebhookAlert(grp huma.API) {
	type webhookAlertInput struct {
		Namespace   string `query:"namespace" required:"true" doc:"Kubernetes namespace where Notif resources are created (query param on the Grafana contact point URL)."`
		ProjectName string `query:"projectName" doc:"Optional Project claim name in that namespace; sets spec.projectName."`
		Body        sealosNotifWebhookBody
	}
	type webhookAlertOutput struct {
		Body struct {
			OK        bool     `json:"ok" doc:"True when all Notifs were applied successfully."`
			Namespace string   `json:"namespace" doc:"Target namespace."`
			Created   []string `json:"created" doc:"metadata.name values applied (one per Grafana alert, or one compact payload)."`
		}
	}

	huma.Register(grp, huma.Operation{
		OperationID: "notif-webhook-alert",
		Method:      http.MethodPost,
		Path:        "/webhook/alert",
		Summary:     "Sealos Notif webhook (Grafana)",
		Description: "Creates `example.crossplane.io/v1` Notifs using `ENCODED_ADMIN_KUBECONFIG`. Accepts either:\n" +
			"- **Compact JSON** - fields like `title`, `summary`, `dedupeKey`, etc.\n" +
			"- **Grafana default webhook** - root `receiver`, `status`, `alerts[]`, `commonLabels`, etc. (one Notif per alert).\n\n" +
			"**Query:** required `namespace`; optional `projectName`.\n",
		Tags: []string{"Notif"},
	}, func(_ context.Context, input *webhookAlertInput) (*webhookAlertOutput, error) {
		bearer, err := middleware.AdminAuthorizationBearer()
		if err != nil {
			return nil, huma.Error500InternalServerError("ENCODED_ADMIN_KUBECONFIG is required for webhook apply", err)
		}
		restCfg, _, err := middleware.RestConfigFromAuth(bearer)
		if err != nil {
			return nil, huma.Error500InternalServerError("invalid ENCODED_ADMIN_KUBECONFIG", err)
		}

		ns := strings.TrimSpace(input.Namespace)
		project := strings.TrimSpace(input.ProjectName)

		payloads := sealosPayloadsFromBody(&input.Body)
		var created []string
		for i := range payloads {
			payload := payloads[i]
			name := notifObjectNameFromPayload(payload)
			yamlBytes, yerr := notifYAMLFromSealos(payload, ns, project)
			if yerr != nil {
				if errors.Is(yerr, errEmptyWebhookPayload) {
					return nil, huma.Error400BadRequest(yerr.Error(), yerr)
				}
				return nil, huma.Error500InternalServerError("failed to build Notif manifest", yerr)
			}
			if err := k8ssvc.ApplyYAML(restCfg, yamlBytes); err != nil {
				log.Printf("notif webhook apply error (item %d): %v", i, err)
				return nil, huma.Error500InternalServerError(fmt.Sprintf("failed to apply Notif %q", name), err)
			}
			created = append(created, name)
		}

		log.Printf("notif webhook: applied %d Notif(s) in namespace %q: %v", len(created), ns, created)

		out := &webhookAlertOutput{}
		out.Body.OK = true
		out.Body.Namespace = ns
		out.Body.Created = created
		return out, nil
	})
}
