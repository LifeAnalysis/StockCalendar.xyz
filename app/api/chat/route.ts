import { jsonResponse } from "@/lib/env";
import { buildStockIntel } from "@/lib/intel";
import { prepareStockTrade } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message || "").toLowerCase();

  if (message.includes("robinhood") || message.includes("stock") || message.includes("kalshi")) {
    const intel = await buildStockIntel();
    return jsonResponse({
      reply: "Robinhood Chain stock universe, Kalshi matches, and public event links are wired. Use the dashboard or /api/robinhood/trade for an atomic quote once exact token contracts, wallet, and amount are present.",
      data: intel,
      tool_trace: [{ name: "buildStockIntel", ok: intel.ok }]
    });
  }

  if (message.includes("trade") || message.includes("buy") || message.includes("sell")) {
    return jsonResponse({
      reply: "Use /api/robinhood/trade with action, source_asset, target_asset, amount, wallet_address, and provider. The agent will prepare the quote but cannot sign.",
      example: await prepareStockTrade({
        action: "buy",
        source_asset: "",
        target_asset: "",
        amount: "",
        wallet_address: "",
        provider: "auto"
      })
    });
  }

  return jsonResponse({
    reply: "Next.js Hermes is live. Ask for Robinhood stocks, Kalshi stock markets, event calendars, or an atomic stock trade quote."
  });
}
