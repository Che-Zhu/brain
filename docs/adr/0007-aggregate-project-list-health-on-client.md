# Aggregate Project list health on the client

The project list shows a status dot per Project row that expresses Project Aggregate Status: the health of the workloads inside that project, not the Project composite's own Ready condition. This aggregation is computed in the UI by listing APs and DBs in the namespace alongside Projects and grouping them by the `crossplane.io/project-uid` label that AP and DB compositions write on their composed resources. The project list issues three parallel `/api/k8s/get` calls (projects, aps, dbs) and joins them in memory rather than calling a server-side aggregate endpoint.

## Considered Options

- Read only the Project composite's `status.conditions[Ready]`: rejected because the current Project Composition annotates its composed Instance with `gotemplating.fn.crossplane.io/ready: "True"`, so the Project Ready condition is True almost immediately after the Project is applied and does not reflect whether the APs and DBs inside the project are running — the question users actually ask while scanning the list.
- Per-project AP/DB queries (N+1): rejected because the request count grows with the number of projects and the same workload data would be re-fetched once per row.
- A server-side batch endpoint such as `/api/projects-with-status`: rejected for v1 because the rest of the project surface already uses the same `/api/k8s/get?kind=...` pattern, the aggregation rule (max-severity over canvas visualTone) is small enough to live as a pure function in the client, and progressive rendering (project names appear immediately, status dots fill in when AP/DB lists arrive) is a positive UX side effect of fanning out from the client. If the cluster ever grows enough that three parallel namespace lists become a tail-latency problem, a server-side batch can be added without changing the UI's `status?: VisualTone` row contract.

## Consequences

The project list page fans out three SWR requests in parallel and joins their responses by `crossplane.io/project-uid`. The aggregation rule lives in a pure function so the same logic can be reused by other surfaces (e.g. canvas project header) without re-querying. The status dot rendering follows Project Aggregate Status semantics defined in [CONTEXT.md](../../CONTEXT.md): canvas 5-tone visualTone, max-severity, paused → neutral, empty/loading → static neutral dot. List rows whose project has loaded but whose AP/DB lists have not yet arrived render the neutral dot until the joins complete, which keeps row geometry stable across the progressive fetch.
