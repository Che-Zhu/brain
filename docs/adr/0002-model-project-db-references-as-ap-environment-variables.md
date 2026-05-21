# Model Project DB References as AP Environment Variables

Project DB references are authored through the AP Environment editor and persisted as standard AP `spec.input.env` entries. This keeps Database Binding inside AP desired state, avoids a second binding persistence model, and lets the same editor handle ordinary external database credentials and Project DB references.

## Considered Options

- Add a separate Database bindings panel or binding record: rejected because it creates a second source of truth beside AP environment variables.
- Generate alias-scoped groups of variables or hidden helper env to assemble DSNs: rejected because it pollutes the environment list and makes the user-visible model harder to reason about.
- Persist reference metadata in AP spec or App Postgres: rejected because standard Kubernetes env shape is enough for AP runtime, and references can be reconstructed from exact Secret or DSN evidence when possible.
- Model external databases as first-class Database Bindings: rejected for v1 because external credentials are just user-authored environment values, not Project resources.

## Consequences

The Environment editor must be structured enough to represent direct values and Project DB references. DSN references write selected private or public connection strings as ordinary env values; primitive fields write `valueFrom.secretKeyRef`. Environment variable names are the user's final API and must be unique within the AP.
