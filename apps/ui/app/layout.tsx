import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { AppShell } from "@/components/app-shell";
import { JotaiProvider } from "@/components/jotai-provider";
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
        <JotaiProvider>
          <ThemeProvider>
            <TooltipProvider>
              <AppShell>{children}</AppShell>
            </TooltipProvider>
          </ThemeProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
