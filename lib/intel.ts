import { fetchStockCalendars } from "./calendar";
import { matchStockMarkets } from "./kalshi";
import { discoverExplorerStockTokens, robinhoodPaymentTokens, robinhoodStockTokens } from "./robinhood";

type PipelineCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  source: string;
  note?: string;
  records: number;
  error?: string;
};

type DecisionAction = "BUY" | "WATCH" | "NO_BUY" | "CONFIG_NEEDED";

type StockRecommendation = {
  symbol: string;
  recommendation: "prepare_quote" | "watch" | "wait_for_cleaner_data";
  action: DecisionAction;
  label: string;
  confidence: number;
  rationale: string;
  user_action: string;
  evidence: {
    official_contract: string;
    kalshi_match_count: number;
    top_kalshi_market?: {
      ticker: string;
      title?: string;
      score: number;
      yes_bid_dollars?: string;
      yes_ask_dollars?: string;
      no_bid_dollars?: string;
      no_ask_dollars?: string;
      liquidity_dollars?: string;
      close_time?: string;
    };
    market_pricing?: {
      yes_bid?: string;
      yes_ask?: string;
      no_bid?: string;
      no_ask?: string;
      spread_note: string;
    };
    calendar_ok: boolean;
    earnings_dates: string[];
    explorer_confirmed: boolean;
  };
  quote_requirements: ["source_asset", "target_asset", "wallet_address", "amount"];
};

type HermesDecision = {
  verdict: string;
  summary: string;
  source_note: string;
  searched_terms: string[];
  action_counts: Record<DecisionAction, number>;
  user_action: string;
  stocks: Array<{
    symbol: string;
    action: DecisionAction;
    label: string;
    confidence: number;
    reason: string;
    routeable: boolean;
    kalshi_match: boolean;
    yes_no_prices: StockRecommendation["evidence"]["market_pricing"] | null;
    user_action: string;
  }>;
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
      note: kalshi.source_note,
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

function timeoutMs(name: string, fallback: number): number {
  const value = Number(process.env[name] || "");
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function sourceTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timer));
  });
}

function kalshiTimeoutFallback(): Awaited<ReturnType<typeof matchStockMarkets>> {
  return {
    ok: false,
    source: "Kalshi public markets timeout",
    scanned_markets: 0,
    search_method: "public_markets_local_filter",
    source_note: "Kalshi public Trade API did not return before the source timeout.",
    error: "source_timeout",
    searched_terms: [],
    stocks: robinhoodStockTokens.map((stock) => ({ stock, match_count: 0, markets: [] }))
  };
}

function calendarTimeoutFallback(): Awaited<ReturnType<typeof fetchStockCalendars>> {
  return robinhoodStockTokens.map((stock) => ({
    symbol: stock.symbol,
    ok: false,
    status: 0,
    source: "Yahoo Finance calendarEvents timeout",
    error: "source_timeout",
    earnings_dates: [],
    estimates: { earnings_average: undefined, revenue_average: undefined },
    public_links: [
      `https://finance.yahoo.com/calendar/earnings?symbol=${stock.symbol}`,
      `https://www.nasdaq.com/market-activity/stocks/${stock.symbol.toLowerCase()}/earnings`
    ]
  }));
}

function explorerTimeoutFallback(): Awaited<ReturnType<typeof discoverExplorerStockTokens>> {
  return {
    ok: false,
    source: "Robinhood Chain explorer search timeout",
    searched_terms: [],
    stock_like_count: 0,
    official_count: 0,
    other_count: 0,
    tokens: [],
    error: "source_timeout"
  };
}

function buildAgentContext(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  calendars: Awaited<ReturnType<typeof fetchStockCalendars>>,
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>,
  recommendations: StockRecommendation[],
  hermesDecision: HermesDecision
) {
  return {
    execution_boundary: "quote_preparation_only_wallet_signature_required",
    trust_policy: "only official Robinhood docs contracts are routed; explorer-discovered tokens are context only",
    kalshi_source_policy: kalshi.source_note,
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
    recommendations,
    hermes_decision: hermesDecision
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
    const action: DecisionAction =
      !kalshi.ok && !calendar?.ok
        ? "CONFIG_NEEDED"
        : recommendation === "prepare_quote"
          ? "BUY"
          : recommendation === "watch"
            ? "WATCH"
            : "NO_BUY";
    const label =
      action === "BUY"
        ? "Buy setup"
        : action === "WATCH"
          ? "Watch"
          : action === "CONFIG_NEEDED"
            ? "Config needed"
            : "No buy";
    const marketPricing = topMarket
      ? {
          yes_bid: topMarket.yes_bid_dollars,
          yes_ask: topMarket.yes_ask_dollars,
          no_bid: topMarket.no_bid_dollars,
          no_ask: topMarket.no_ask_dollars,
          spread_note:
            topMarket.yes_bid_dollars && topMarket.yes_ask_dollars
              ? `YES ${topMarket.yes_bid_dollars} bid / ${topMarket.yes_ask_dollars} ask; NO ${topMarket.no_bid_dollars || "n/a"} bid / ${topMarket.no_ask_dollars || "n/a"} ask`
              : "Kalshi market returned without complete yes/no quote fields"
        }
      : undefined;
    const rationale =
      action === "CONFIG_NEEDED"
        ? "Required market or event sources are unavailable, so Hermes cannot form a clean Robinhood Chain stock-token recommendation."
        : recommendation === "prepare_quote"
        ? `Official Robinhood Chain stock route is available and supporting Kalshi/event context is usable. ${marketPricing?.spread_note || ""}`.trim()
        : recommendation === "watch"
          ? `Official Robinhood Chain stock route is available, but supporting evidence is not strong enough for a buy setup. ${marketPricing?.spread_note || ""}`.trim()
          : "Official Robinhood Chain stock route is available, but there is no clean supporting stock-specific Kalshi market and calendar context is thin right now.";
    const userAction =
      action === "CONFIG_NEEDED"
        ? "Fix the missing/degraded data source before presenting this as a buy recommendation."
        : recommendation === "prepare_quote"
        ? "Prepare a Robinhood Chain stock-token quote only if the user accepts the supporting evidence and wallet-signing step."
        : recommendation === "watch"
          ? "Keep the stock on watch. Do not ask the wallet to sign until a cleaner Kalshi or calendar signal appears."
          : "Do not recommend buying this Robinhood Chain stock-token right now. Show route readiness only, and wait for cleaner supporting evidence.";

    return {
      symbol: stock.symbol,
      recommendation,
      action,
      label,
      confidence,
      rationale,
      user_action: userAction,
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
              no_bid_dollars: topMarket.no_bid_dollars,
              no_ask_dollars: topMarket.no_ask_dollars,
              liquidity_dollars: topMarket.liquidity_dollars,
              close_time: topMarket.close_time
            }
          : undefined,
        market_pricing: marketPricing,
        calendar_ok: Boolean(calendar?.ok),
        earnings_dates: (calendar?.earnings_dates || []).filter((date): date is string => Boolean(date)),
        explorer_confirmed: explorerConfirmed
      },
      quote_requirements: ["source_asset", "target_asset", "wallet_address", "amount"]
    };
  });
}

function buildHermesDecision(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  recommendations: StockRecommendation[]
): HermesDecision {
  const actionCounts = recommendations.reduce<Record<DecisionAction, number>>(
    (counts, recommendation) => {
      counts[recommendation.action] += 1;
      return counts;
    },
    { BUY: 0, WATCH: 0, NO_BUY: 0, CONFIG_NEEDED: 0 }
  );
  const cleanMatches = recommendations.filter((recommendation) => recommendation.evidence.kalshi_match_count > 0);
  const verdict =
    actionCounts.BUY > 0
      ? "Robinhood Chain buy setup found"
      : actionCounts.WATCH > 0
        ? "Watch only: no buy setup yet"
        : actionCounts.CONFIG_NEEDED > 0
          ? "Configuration needed before acting"
          : "No Robinhood Chain buy setup right now";
  const summary =
    cleanMatches.length > 0
      ? `${cleanMatches.length} stock(s) have clean supporting public Kalshi Trade API markets with yes/no pricing available for review.`
      : `Fetched ${kalshi.scanned_markets} public Kalshi market(s) and filtered them against Robinhood stock terms, but none mapped cleanly to a Robinhood Chain stock-token buy setup.`;
  const userAction =
    actionCounts.BUY > 0
      ? "Review the supporting Kalshi YES/NO prices, then prepare a Robinhood Chain quote only after the user confirms the wallet-signing step."
      : actionCounts.WATCH > 0
        ? "Keep the Robinhood Chain stock route visible, but wait for cleaner supporting evidence before recommending a buy."
        : actionCounts.CONFIG_NEEDED > 0
          ? "Fix the degraded data source first; do not present a buy recommendation."
          : "Do not recommend buying. Show route readiness only, and wait for clean stock-specific supporting evidence.";

  return {
    verdict,
    summary,
    source_note: kalshi.source_note,
    searched_terms: kalshi.searched_terms || [],
    action_counts: actionCounts,
    user_action: userAction,
    stocks: recommendations.map((recommendation) => ({
      symbol: recommendation.symbol,
      action: recommendation.action,
      label: recommendation.label,
      confidence: recommendation.confidence,
      reason: recommendation.rationale,
      routeable: true,
      kalshi_match: recommendation.evidence.kalshi_match_count > 0,
      yes_no_prices: recommendation.evidence.market_pricing || null,
      user_action: recommendation.user_action
    }))
  };
}

export async function buildStockIntel() {
  const [kalshi, calendars, explorerDiscovery] = await Promise.all([
    sourceTimeout(matchStockMarkets(robinhoodStockTokens), timeoutMs("KALSHI_SOURCE_TIMEOUT_MS", 30000), kalshiTimeoutFallback()),
    sourceTimeout(fetchStockCalendars(robinhoodStockTokens), timeoutMs("CALENDAR_SOURCE_TIMEOUT_MS", 8000), calendarTimeoutFallback()),
    sourceTimeout(discoverExplorerStockTokens(), timeoutMs("EXPLORER_SOURCE_TIMEOUT_MS", 6000), explorerTimeoutFallback())
  ]);
  const checks = buildPipelineChecks(kalshi, calendars, explorerDiscovery);
  const recommendations = buildStockRecommendations(kalshi, calendars, explorerDiscovery);
  const hermesDecision = buildHermesDecision(kalshi, recommendations);

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
    hermes_decision: hermesDecision,
    agent_context: buildAgentContext(kalshi, calendars, explorerDiscovery, recommendations, hermesDecision)
  };
}
