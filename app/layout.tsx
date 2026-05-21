import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hermes Robinhood Chain",
  description: "Nuvolari and Kalshi command center for Robinhood Chain stock tokens"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
