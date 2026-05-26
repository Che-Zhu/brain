import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";
import AuthBootstrap, { DevboxBootstrap } from "@/components/auth-bootstrap";
import ProjectWorkspaceLayout from "@/components/project-workspace-layout";
import { fetchProjectCredentialsOrUnauthorized } from "@/lib/server-credentials";

/** Request-bound (`cookies()`, env); avoids Full Route Cache skipping credentials on refresh. */
export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { serverEncodedKubeconfig, serverNamespace } =
    await fetchProjectCredentialsOrUnauthorized();

  return (
    <AppShellChrome>
      <AuthBootstrap
        serverEncodedKubeconfig={serverEncodedKubeconfig}
        serverNamespace={serverNamespace}
      />
      <DevboxBootstrap />
      <AppShellSidebar />
      <AppShellView className="min-w-0 flex-1 basis-0">
        <ProjectWorkspaceLayout>{children}</ProjectWorkspaceLayout>
      </AppShellView>
    </AppShellChrome>
  );
}
