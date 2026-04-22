import {
  AppShellChrome,
  AppShellSidebar,
  AppShellView,
} from "@/components/app-shell";

export default function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShellChrome>
      <AppShellSidebar />
      <AppShellView>{children}</AppShellView>
    </AppShellChrome>
  );
}
