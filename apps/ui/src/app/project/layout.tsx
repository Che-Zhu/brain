import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";
import AuthBootstrap, { SandboxBootstrap } from "@/components/auth-bootstrap";
import ProjectChatPaneLayout from "@/components/project-chat-pane-layout";
import { fetchServerCredentials } from "@/lib/server-credentials";

/** Request-bound (`cookies()`, env); avoids Full Route Cache skipping credentials on refresh. */
export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { serverEncodedKubeconfig, serverNamespace } =
    await fetchServerCredentials();

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
