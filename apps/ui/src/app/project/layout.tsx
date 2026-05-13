import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";
import AuthBootstrap, { SandboxBootstrap } from "@/components/auth-bootstrap";
import ProjectChatPaneLayout from "@/components/project-chat-pane-layout";
import { fetchServerCredentials } from "@/lib/server-credentials";
import { headers } from "next/headers";

/** Request-bound (`cookies()`, env); avoids Full Route Cache so refreshes re-run credentials fetch + logs. */
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[ProjectLayout]" as const;

function layoutTrace(line: string): void {
  process.stderr.write(`${LOG_PREFIX} ${line}\n`);
}

export default async function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reqHeaders = await headers();
  const host =
    reqHeaders.get("x-forwarded-host") ??
    reqHeaders.get("host") ??
    "unknown";
  layoutTrace(`render start host=${host}`);

  const t0 = Date.now();
  layoutTrace("fetchServerCredentials…");
  const { serverEncodedKubeconfig, serverNamespace } =
    await fetchServerCredentials();
  const elapsedMs = Date.now() - t0;

  layoutTrace(
    `fetchServerCredentials done in ${String(elapsedMs)}ms encodedKubeconfigChars=${String(serverEncodedKubeconfig.length)} namespaceChars=${String(serverNamespace.length)} namespace=${JSON.stringify(serverNamespace)}`
  );

  layoutTrace("render shell (AuthBootstrap + chat pane)");

  return (
    <AppShellChrome>
      <AuthBootstrap
        serverEncodedKubeconfig={serverEncodedKubeconfig}
        serverNamespace={serverNamespace}
      />
      <SandboxBootstrap />
      <AppShellSidebar />
      <AppShellView className="min-w-0 flex-1 basis-0">
        <ProjectChatPaneLayout>{children}</ProjectChatPaneLayout>
      </AppShellView>
    </AppShellChrome>
  );
}
