import { cookies } from "next/headers";
import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";
import AuthBootstrap from "@/components/auth-bootstrap";

interface RegionTokenResponse {
  body?: { encodedKubeconfig?: unknown; namespace?: unknown };
  encodedKubeconfig?: unknown;
  namespace?: unknown;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

async function fetchServerCredentials(): Promise<{
  serverEncodedKubeconfig: string;
  serverNamespace: string;
}> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }

  const cookieStore = await cookies();
  const regionToken = cookieStore.get("sealos_auth_token")?.value?.trim() ?? "";
  if (regionToken === "") {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }

  let response: Response;
  try {
    response = await fetch(new URL("/api/auth/v1alpha1/regionToken", apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionToken }),
      cache: "no-store",
    });
  } catch {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }
  if (!response.ok) {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }

  let raw: RegionTokenResponse;
  try {
    raw = (await response.json()) as RegionTokenResponse;
  } catch {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }
  return {
    serverEncodedKubeconfig: pickString(
      raw.encodedKubeconfig,
      raw.body?.encodedKubeconfig
    ),
    serverNamespace: pickString(raw.namespace, raw.body?.namespace),
  };
}

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
      <AppShellView>{children}</AppShellView>
    </AppShellChrome>
  );
}
