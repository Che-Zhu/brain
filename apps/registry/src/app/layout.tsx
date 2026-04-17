import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "@/styles/globals.css";
import { getRegistrySidebarSections } from "@registry/lib";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
