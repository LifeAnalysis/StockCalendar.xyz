import { jsonResponse } from "@/lib/env";
import { robinhoodChainId, robinhoodExplorer, robinhoodRpcUrl } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

export async function GET() {
  const openrouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const rpcConfigured = Boolean(robinhoodRpcUrl());

  return jsonResponse({
    ok: true,
    runtime: "nextjs",
    model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash",
    openrouter_configured: openrouterConfigured,
    robinhood_chain: {
      chainId: robinhoodChainId(),
      explorer: robinhoodExplorer(),
      rpc_configured: rpcConfigured,
      stock_trade_tool: null,
      quote_provider_configured: false
    },
    data_pipeline: {
      intel_endpoint: "/api/robinhood/intel",
      hermes_output_endpoint: "/api/hermes/output",
      agent_context: "robinhood_chain_tokens+stock_signal_feeds+kalshi_public_markets+public_event_calendars+explorer_discovery+recommendations"
    },
    kalshi: {
      base_url: process.env.KALSHI_API_BASE_URL || "https://external-api.kalshi.com/trade-api/v2",
      public_market_data: true
    },
    stock_signals: {
      stooq_public_quotes: true,
      sec_edgar_submissions: true,
      gdelt_news: true,
      sec_user_agent_configured: Boolean(process.env.SEC_USER_AGENT?.trim())
    }
  });
}
