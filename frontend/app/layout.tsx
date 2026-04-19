import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Supreme High Crypto Court",
  description: "A GenLayer court where crypto cases are evaluated by AI profiles of eight Web3 thinkers.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg?v=2", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg?v=2", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#15100c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
