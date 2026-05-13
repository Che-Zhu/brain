"use client";

import "./environment-node.css";

import {
  EnvironmentNodeActionBar,
  EnvironmentNodeBodyContent,
  EnvironmentNodeContent,
  EnvironmentNodeFooterContent,
  EnvironmentNodeHeaderContent,
  EnvironmentNodeLaunchCommand,
} from "./environment-node.content";
import { EnvironmentNodeRoot } from "./environment-node.root";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useEnvironmentNode }`
export { useEnvironmentNode } from "./environment-node.context";
export {
  canCopyEnvironmentLaunchCommand,
  EnvironmentNodeRoot,
} from "./environment-node.root";
export type {
  EnvironmentNodeAction,
  EnvironmentNodeActions,
  EnvironmentNodeContextValue,
  EnvironmentNodeCopyLaunchCommandHandler,
  EnvironmentNodeLifecycleActionKey,
  EnvironmentNodeLifecycleActions,
  EnvironmentNodeMeta,
  EnvironmentNodeMetricKey,
  EnvironmentNodeMetricValue,
  EnvironmentNodeProviderProps,
  EnvironmentNodeQuickActionKey,
  EnvironmentNodeQuickActions,
  EnvironmentNodeRootProps,
  EnvironmentNodeStartConnectionHandler,
  EnvironmentNodeState,
  EnvironmentNodeStates,
  EnvironmentRuntimeKey,
} from "./environment-node.types";
export {
  CppRuntimeIcon,
  DotNetRuntimeIcon,
  EnvironmentFallbackIcon,
  GoRuntimeIcon,
  getEnvironmentRuntimeIcon,
  getEnvironmentRuntimeTone,
  JavaRuntimeIcon,
  NodeJsRuntimeIcon,
  PhpRuntimeIcon,
  PythonRuntimeIcon,
  RubyRuntimeIcon,
  RustRuntimeIcon,
} from "./environment-runtime-icons";

export const EnvironmentNode = {
  ActionBar: EnvironmentNodeActionBar,
  BodyContent: EnvironmentNodeBodyContent,
  Content: EnvironmentNodeContent,
  FooterContent: EnvironmentNodeFooterContent,
  HeaderContent: EnvironmentNodeHeaderContent,
  LaunchCommand: EnvironmentNodeLaunchCommand,
  Root: EnvironmentNodeRoot,
} as const;

const dn = (component: object, name: string) => {
  (component as { displayName?: string }).displayName = name;
};

dn(EnvironmentNodeRoot, "EnvironmentNode.Root");
dn(EnvironmentNodeContent, "EnvironmentNode.Content");
dn(EnvironmentNodeHeaderContent, "EnvironmentNode.HeaderContent");
dn(EnvironmentNodeBodyContent, "EnvironmentNode.BodyContent");
dn(EnvironmentNodeLaunchCommand, "EnvironmentNode.LaunchCommand");
dn(EnvironmentNodeActionBar, "EnvironmentNode.ActionBar");
dn(EnvironmentNodeFooterContent, "EnvironmentNode.FooterContent");
