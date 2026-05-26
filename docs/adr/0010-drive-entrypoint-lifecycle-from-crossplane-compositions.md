# Drive EntryPoint Lifecycle from Crossplane Compositions

EntryPoint is a separate Crossplane resource from AP, but its lifecycle is driven by Crossplane compositions rather than a custom controller. The AP Composition writes the EntryPoint desired spec when an AP has allocated public routing targets and owns cleanup with AP deletion; the EntryPoint Composition reconciles public-entry resources and status.

## Considered Options

- Keep public routing and Custom Domain Binding lifecycle on AP: rejected because DNS verification, routing, and certificate failures are not AP workload failures and would pollute AP status.
- Add a custom controller to watch APs and manage EntryPoints: rejected because AP, DB, and EntryPoint already use the Crossplane XRD and Composition model, and a controller would introduce a second reconciliation architecture.
- Let EntryPoint independently discover AP routing intent: rejected because AP owns the user's public routing intent, so EntryPoint should not recalculate AP network allocation rules from outside the AP Composition.

## Consequences

AP Composition writes EntryPoint spec through provider-kubernetes, including the AP reference and public routing targets. EntryPoint Composition owns its own composed resources and status, including Custom Domain Binding routing and certificate lifecycle. A Requested Platform Address can remain pending before an EntryPoint exists when allocation inputs are missing, and deleting the AP removes the generated EntryPoint through the AP composition lifecycle.
