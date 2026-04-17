import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "@/styles/globals.css";
import { getRegistrySidebarSections } from "@registry/lib";
import { Toaster } from "@workspace/ui/components/sonner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const registrySections = getRegistrySidebarSections();

  return (
    <html
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <NuqsAdapter>
              <Suspense fallback={null}>
                <AppShell registrySections={registrySections}>
                  {children}
                </AppShell>
              </Suspense>
            </NuqsAdapter>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
