import { cookies } from "next/headers";
import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";

export default async function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sealosAuth = cookieStore.get("sealos_auth_token");
  console.log("sealos_auth_token", sealosAuth?.value ?? null);

  return (
    <AppShellChrome>
      <AppShellSidebar />
      <AppShellView>{children}</AppShellView>
    </AppShellChrome>
  );
}
