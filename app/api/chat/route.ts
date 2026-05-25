import { jsonResponse } from "@/lib/env";
import { buildHermesOutput } from "@/lib/hermes-output";

export const dynamic = "force-dynamic";

const STOCK_KEYWORDS = [
  "robinhood",
  "stock",
  "stocks",
  "kalshi",
  "market",
  "markets",
  "quote",
  "trade",
  "buy",
  "sell",
  "earnings",
  "calendar",
  "tsla",
  "amzn",
  "pltr",
  "nflx",
  "amd"
];

function wantsStockIntel(message: string): boolean {
  return STOCK_KEYWORDS.some((keyword) => message.includes(keyword));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message || "").toLowerCase();

  if (wantsStockIntel(message)) {
    return jsonResponse(await buildHermesOutput(message));
  }

  return jsonResponse({
    reply: "Next.js Hermes is live. Ask for Robinhood stocks, Kalshi stock markets, event calendars, SEC filings, news, or Hermes stock research."
  });
}
