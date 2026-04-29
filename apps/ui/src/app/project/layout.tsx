import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";
import AuthBootstrap from "@/components/auth-bootstrap";
import { fetchServerCredentials } from "@/lib/server-credentials";

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
      <AppShellSidebar />
      <AppShellView className="min-w-0 flex-1 basis-0">
        {children}
      </AppShellView>
    </AppShellChrome>
  );
}
