import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css";

export const metadata: Metadata = {
  title: "Groot Monitor",
  description: "Live telemetry from Grootbot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}
