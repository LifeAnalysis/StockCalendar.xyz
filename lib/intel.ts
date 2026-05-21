import { fetchStockCalendars } from "./calendar";
import { matchStockMarkets } from "./kalshi";
import { discoverExplorerStockTokens, robinhoodPaymentTokens, robinhoodStockTokens } from "./robinhood";

type PipelineCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  source: string;
  records: number;
  error?: string;
};

type StockRecommendation = {
  symbol: string;
  recommendation: "prepare_quote" | "watch" | "wait_for_cleaner_data";
  label: string;
  confidence: number;
  rationale: string;
  evidence: {
    official_contract: string;
    kalshi_match_count: number;
    top_kalshi_market?: {
      ticker: string;
      title?: string;
      score: number;
      yes_bid_dollars?: string;
      yes_ask_dollars?: string;
      liquidity_dollars?: string;
      close_time?: string;
    };
    calendar_ok: boolean;
    earnings_dates: string[];
    explorer_confirmed: boolean;
  };
  quote_requirements: ["source_asset", "target_asset", "wallet_address", "amount"];
};

function buildPipelineChecks(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  calendars: Awaited<ReturnType<typeof fetchStockCalendars>>,
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>
): PipelineCheck[] {
  return [
    {
      name: "robinhood_chain_tokens",
      ok: robinhoodStockTokens.length > 0 && robinhoodPaymentTokens.length > 0,
      required: true,
      source: "https://docs.robinhood.com/chain/contracts/",
      records: robinhoodStockTokens.length + robinhoodPaymentTokens.length
    },
    {
      name: "kalshi_public_markets",
      ok: kalshi.ok,
      required: false,
      source: kalshi.source,
      records: kalshi.scanned_markets,
      error: kalshi.error
    },
    {
      name: "public_event_calendars",
      ok: calendars.every((calendar) => calendar.ok || calendar.public_links.length > 0),
      required: false,
      source: "Yahoo Finance calendarEvents with public fallback links",
      records: calendars.length,
      error: calendars
        .filter((calendar) => !calendar.ok && calendar.error)
        .map((calendar) => `${calendar.symbol}: ${calendar.error}`)
        .join("; ") || undefined
    },
    {
      name: "explorer_stock_like_tokens",
      ok: explorerDiscovery.ok,
      required: false,
      source: explorerDiscovery.source,
      records: explorerDiscovery.stock_like_count,
      error: explorerDiscovery.error
    }
  ];
}

function buildAgentContext(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  calendars: Awaited<ReturnType<typeof fetchStockCalendars>>,
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>,
  recommendations: StockRecommendation[]
) {
  return {
    execution_boundary: "quote_preparation_only_wallet_signature_required",
    trust_policy: "only official Robinhood docs contracts are routed; explorer-discovered tokens are context only",
    quote_endpoint: "/api/robinhood/trade",
    stock_tokens: robinhoodStockTokens.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      address: stock.address,
      chainId: stock.chainId,
      aliases: stock.aliases
    })),
    payment_tokens: robinhoodPaymentTokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      chainId: token.chainId,
      aliases: token.aliases
    })),
    kalshi_matches: kalshi.stocks.map((row) => ({
      symbol: row.stock.symbol,
      match_count: row.match_count,
      top_markets: row.markets.slice(0, 3)
    })),
    calendars: calendars.map((calendar) => ({
      symbol: calendar.symbol,
      ok: calendar.ok,
      earnings_dates: calendar.earnings_dates,
      estimates: calendar.estimates,
      public_links: calendar.public_links
    })),
    explorer_discovered_tokens: explorerDiscovery.tokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      trust_level: token.trust_level,
      routed_by_agent: token.routed_by_agent
    })),
    recommendations
  };
}

function buildStockRecommendations(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  calendars: Awaited<ReturnType<typeof fetchStockCalendars>>,
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>
): StockRecommendation[] {
  return robinhoodStockTokens.map((stock) => {
    const marketRow = kalshi.stocks.find((row) => row.stock.symbol === stock.symbol);
    const topMarket = marketRow?.markets[0];
    const calendar = calendars.find((row) => row.symbol === stock.symbol);
    const explorerConfirmed = explorerDiscovery.tokens.some(
      (token) => token.routed_by_agent && token.address.toLowerCase() === stock.address.toLowerCase()
    );
    const confidence = Math.min(
      95,
      35 +
        (topMarket ? Math.min(topMarket.score * 5, 30) : 0) +
        (calendar?.ok ? 15 : 0) +
        (explorerConfirmed ? 10 : 0) +
        Math.min((marketRow?.match_count || 0) * 2, 5)
    );
    const recommendation: StockRecommendation["recommendation"] =
      topMarket && confidence >= 70 ? "prepare_quote" : topMarket || calendar?.ok ? "watch" : "wait_for_cleaner_data";
    const label =
      recommendation === "prepare_quote"
        ? "Prepare quote"
        : recommendation === "watch"
          ? "Watch"
          : "Wait for cleaner data";
    const rationale =
      recommendation === "prepare_quote"
        ? "Official contract is routeable and Hermes found usable market or event context."
        : recommendation === "watch"
          ? "Official contract is routeable, but the evidence is not strong enough for an execution ticket."
          : "Official contract is routeable, but public market and calendar context are thin right now.";

    return {
      symbol: stock.symbol,
      recommendation,
      label,
      confidence,
      rationale,
      evidence: {
        official_contract: stock.address,
        kalshi_match_count: marketRow?.match_count || 0,
        top_kalshi_market: topMarket
          ? {
              ticker: topMarket.ticker,
              title: topMarket.title,
              score: topMarket.score,
              yes_bid_dollars: topMarket.yes_bid_dollars,
              yes_ask_dollars: topMarket.yes_ask_dollars,
              liquidity_dollars: topMarket.liquidity_dollars,
              close_time: topMarket.close_time
            }
          : undefined,
        calendar_ok: Boolean(calendar?.ok),
        earnings_dates: (calendar?.earnings_dates || []).filter((date): date is string => Boolean(date)),
        explorer_confirmed: explorerConfirmed
      },
      quote_requirements: ["source_asset", "target_asset", "wallet_address", "amount"]
    };
  });
}

export async function buildStockIntel() {
  const [kalshi, calendars, explorerDiscovery] = await Promise.all([
    matchStockMarkets(robinhoodStockTokens),
    fetchStockCalendars(robinhoodStockTokens),
    discoverExplorerStockTokens()
  ]);
  const checks = buildPipelineChecks(kalshi, calendars, explorerDiscovery);
  const recommendations = buildStockRecommendations(kalshi, calendars, explorerDiscovery);

  return {
    ok: checks.every((check) => !check.required || check.ok),
    timestamp: new Date().toISOString(),
    pipeline: {
      ok: checks.every((check) => !check.required || check.ok),
      checks,
      required_ok: checks.filter((check) => check.required).every((check) => check.ok),
      degraded_sources: checks.filter((check) => !check.ok).map((check) => check.name)
    },
    robinhood_chain: {
      stock_count: robinhoodStockTokens.length,
      payment_tokens: robinhoodPaymentTokens,
      stocks: robinhoodStockTokens,
      source: "https://docs.robinhood.com/chain/contracts/"
    },
    explorer_discovery: explorerDiscovery,
    kalshi,
    calendars,
    recommendations,
    agent_context: buildAgentContext(kalshi, calendars, explorerDiscovery, recommendations)
  };
}
