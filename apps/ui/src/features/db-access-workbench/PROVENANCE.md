# DB Access Workbench Provenance

This feature is a direct DataFlow database browsing UI port, not an approximation.

The workbench must preserve DataFlow's browsing workspace structure, visual language, and interaction spine while replacing DataFlow runtime assumptions with the brainv2 DB Access adapter boundary. Do not replace this module with a generic tree, generic tabs, plain table, generic cards, or a simplified empty state without revisiting ADR 0011.

Authoritative source root:

`/Users/sealos/Documents/GitHub/dataflow/dataflow`

Primary source paths for this port:

- `src/components/layout/MainLayout.tsx`
- `src/components/layout/TabBar.tsx`
- `src/components/layout/TabContent.tsx`
- `src/components/sidebar/Sidebar.tsx`
- `src/components/sidebar/SidebarTree/SidebarTreeProvider.tsx`
- `src/components/sidebar/SidebarTree/SidebarTree.Node.tsx`
- `src/components/sidebar/SidebarTree/types.ts`
- `src/stores/useTabStore.ts`
- `src/stores/useConnectionStore.ts`

brainv2 owns the Canvas Action Surface host, selected DB context, route/action state, auth context, close behavior, and adapter wiring. This module owns the ported browsing workspace, object tree, tabs, data views, filters, pagination, export state, capability gates, and workbench store.
