import { jsonResponse } from "@/lib/env";
import { robinhoodChainId, robinhoodExplorer, robinhoodRpcUrl } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse({
    ok: true,
    runtime: "nextjs",
    model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash",
    openrouter_configured: Boolean(process.env.OPENROUTER_API_KEY),
    nuvolari_configured: Boolean(process.env.NUVOLARI_API_BASE_URL || "https://api.staging.nuvolari.ai"),
    robinhood_chain: {
      chainId: robinhoodChainId(),
      explorer: robinhoodExplorer(),
      rpc_configured: Boolean(robinhoodRpcUrl()),
      stock_trade_tool: "/api/robinhood/trade"
    },
    kalshi: {
      base_url: process.env.KALSHI_API_BASE_URL || "https://external-api.kalshi.com/trade-api/v2",
      public_market_data: true
    },
    providers: {
      nuvolari: Boolean(process.env.NUVOLARI_API_BASE_URL || "https://api.staging.nuvolari.ai"),
      arqsy: Boolean(process.env.ARQSY_API_BASE_URL)
    }
  });
}
