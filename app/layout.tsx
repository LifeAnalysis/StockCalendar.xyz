import "../src/styles.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Hermes Robinhood Chain",
  description: "Kalshi and market-intelligence command center for Robinhood Chain stock tokens"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const cookies = headersList.get("cookie");

  return (
    <html lang="en">
      <body>
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}
