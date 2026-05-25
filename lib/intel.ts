import { fetchStockCalendars } from "./calendar";
import { matchStockMarkets } from "./kalshi";
import { discoverExplorerStockTokens, robinhoodPaymentTokens, robinhoodStockTokens } from "./robinhood";
import { fetchStockSignals } from "./stock-signals";

function formatPrice(value?: number) {
  if (!Number.isFinite(value)) return "n/a";
  const n = Number(value);
  return `$${n.toFixed(n >= 100 ? 2 : 4)}`;
}

function parseMarketDollars(value?: string) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function explainScoreBreakdown(components: ScoreComponent[], total: number) {
  const contributors = components
    .filter((component) => component.points > 0)
    .sort((a, b) => b.points - a.points);
  const missing = components.filter((component) => !component.present || component.points === 0);
  if (!contributors.length) {
    return `Score ${total}/100 — no scored signal cleared its threshold; every component is missing.`;
  }
  const joinList = (items: string[]) => {
    if (items.length <= 1) return items.join("");
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  };
  const fmt = (component: ScoreComponent) => `${component.label} (+${component.points})`;
  const lead = contributors.slice(0, 2).map(fmt);
  const rest = contributors.slice(2).map(fmt);
  let contributorPhrase = `led by ${joinList(lead)}`;
  if (rest.length) {
    contributorPhrase += `, plus ${joinList(rest)}`;
  }
  const missingPhrase = missing.length
    ? ` ${joinList(missing.map((component) => component.label))} ${missing.length === 1 ? "is" : "are"} missing.`
    : "";
  return `Score ${total}/100 — ${contributorPhrase}.${missingPhrase}`;
}

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

type ScoreComponent = {
  key: string;
  label: string;
  points: number;
  max: number;
  present: boolean;
};

type StockRecommendation = {
  symbol: string;
  recommendation: "prepare_quote" | "watch" | "wait_for_cleaner_data";
  action: DecisionAction;
  label: string;
  confidence: number;
  score_breakdown: ScoreComponent[];
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
    price_snapshot?: {
      close?: number;
      date?: string;
      volume?: number;
      source: string;
    };
    latest_filing?: {
      form: string;
      filing_date?: string;
      document_url?: string;
    };
    news_count: number;
    top_news: Array<{
      title: string;
      url?: string;
      domain?: string;
    }>;
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
    score_breakdown: ScoreComponent[];
    score_explanation: string;
    reason: string;
    routeable: boolean;
    kalshi_match: boolean;
    yes_no_prices: StockRecommendation["evidence"]["market_pricing"] | null;
    price: StockRecommendation["evidence"]["price_snapshot"] | null;
    latest_filing: StockRecommendation["evidence"]["latest_filing"] | null;
    news_count: number;
    user_action: string;
  }>;
};

function buildPipelineChecks(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  calendars: Awaited<ReturnType<typeof fetchStockCalendars>>,
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>,
  stockSignals: Awaited<ReturnType<typeof fetchStockSignals>>
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
      source: "MarketBeat earnings pages with Yahoo Finance and Nasdaq public fallback links",
      records: calendars.length,
      error: calendars
        .filter((calendar) => !calendar.ok && calendar.error)
        .map((calendar) => `${calendar.symbol}: ${calendar.error}`)
        .join("; ") || undefined
    },
    {
      name: "stooq_public_quotes",
      ok: stockSignals.prices.some((row) => row.ok),
      required: false,
      source: "https://stooq.com/q/l/",
      note: stockSignals.source_note,
      records: stockSignals.prices.filter((row) => row.ok).length,
      error: stockSignals.prices.filter((row) => !row.ok && row.error).map((row) => `${row.symbol}: ${row.error}`).join("; ") || undefined
    },
    {
      name: "sec_edgar_filings",
      ok: stockSignals.filings.some((row) => row.ok),
      required: false,
      source: "https://data.sec.gov/submissions/",
      note: "SEC requests require SEC_USER_AGENT to identify the integration.",
      records: stockSignals.filings.filter((row) => row.ok).length,
      error: stockSignals.filings.filter((row) => !row.ok && row.error).map((row) => `${row.symbol}: ${row.error}`).join("; ") || undefined
    },
    {
      name: "gdelt_news",
      ok: stockSignals.news.some((row) => row.ok && row.article_count > 0),
      required: false,
      source: "https://api.gdeltproject.org/api/v2/doc/doc + https://feeds.finance.yahoo.com/rss/2.0/headline",
      note: "Optional broad news pressure signal; ignored for BUY unless articles are returned cleanly.",
      records: stockSignals.news.reduce((count, row) => count + row.article_count, 0),
      error: stockSignals.news.filter((row) => !row.ok && row.error).map((row) => `${row.symbol}: ${row.error}`).join("; ") || undefined
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
    search_method: "public_markets_keyword_scan",
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

function stockSignalsTimeoutFallback(): Awaited<ReturnType<typeof fetchStockSignals>> {
  return {
    ok: false,
    source_note: "Stock signal sources timed out before Hermes could use them.",
    prices: robinhoodStockTokens.map((stock) => ({ symbol: stock.symbol, ok: false, source: "Stooq public quotes timeout", error: "source_timeout" })),
    filings: robinhoodStockTokens.map((stock) => ({
      symbol: stock.symbol,
      ok: false,
      source: "SEC EDGAR submissions timeout",
      recent_material_count: 0,
      recent_forms: [],
      error: "source_timeout"
    })),
    news: robinhoodStockTokens.map((stock) => ({
      symbol: stock.symbol,
      ok: false,
      source: "GDELT news timeout",
      article_count: 0,
      top_articles: [],
      error: "source_timeout"
    }))
  };
}

function buildAgentContext(
  kalshi: Awaited<ReturnType<typeof matchStockMarkets>>,
  calendars: Awaited<ReturnType<typeof fetchStockCalendars>>,
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>,
  stockSignals: Awaited<ReturnType<typeof fetchStockSignals>>,
  recommendations: StockRecommendation[],
  hermesDecision: HermesDecision
) {
  return {
    execution_boundary: "quote_preparation_only_wallet_signature_required",
    trust_policy: "only official Robinhood docs contracts are routed; explorer-discovered tokens are context only",
    kalshi_source_policy: kalshi.source_note,
    stock_signal_policy: stockSignals.source_note,
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
    stock_signals: robinhoodStockTokens.map((stock) => {
      const price = stockSignals.prices.find((row) => row.symbol === stock.symbol);
      const filing = stockSignals.filings.find((row) => row.symbol === stock.symbol);
      const news = stockSignals.news.find((row) => row.symbol === stock.symbol);
      return {
        symbol: stock.symbol,
        price: price?.ok ? { close: price.close, date: price.date, volume: price.volume, source: price.source } : null,
        latest_filing: filing?.latest_material || null,
        news_count: news?.article_count || 0,
        top_news: (news?.top_articles || []).slice(0, 3)
      };
    }),
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
  explorerDiscovery: Awaited<ReturnType<typeof discoverExplorerStockTokens>>,
  stockSignals: Awaited<ReturnType<typeof fetchStockSignals>>
): StockRecommendation[] {
  return robinhoodStockTokens.map((stock) => {
    const marketRow = kalshi.stocks.find((row) => row.stock.symbol === stock.symbol);
    const topMarket = marketRow?.markets[0];
    const calendar = calendars.find((row) => row.symbol === stock.symbol);
    const price = stockSignals.prices.find((row) => row.symbol === stock.symbol);
    const filing = stockSignals.filings.find((row) => row.symbol === stock.symbol);
    const news = stockSignals.news.find((row) => row.symbol === stock.symbol);
    const explorerConfirmed = explorerDiscovery.tokens.some(
      (token) => token.routed_by_agent && token.address.toLowerCase() === stock.address.toLowerCase()
    );
    const marketDepth = topMarket
      ? Math.max(
          parseMarketDollars(topMarket.liquidity_dollars),
          parseMarketDollars(topMarket.volume_24h_fp),
          parseMarketDollars(topMarket.volume_fp)
        )
      : 0;
    const marketDepthOk = marketDepth >= 100;
    const kalshiMarketPoints = topMarket
      ? marketDepthOk
        ? Math.min(topMarket.score * 5, 45)
        : Math.min(topMarket.score, 15)
      : 0;
    const scoreComponents: ScoreComponent[] = [
      { key: "kalshi", label: "Kalshi market", points: kalshiMarketPoints, max: 45, present: Boolean(topMarket) },
      { key: "calendar", label: "Earnings calendar", points: calendar?.ok ? 15 : 0, max: 15, present: Boolean(calendar?.ok) },
      { key: "price", label: "Public quote", points: price?.ok ? 15 : 0, max: 15, present: Boolean(price?.ok) },
      { key: "filing", label: "SEC filing", points: filing?.ok && filing.latest_material ? 15 : 0, max: 15, present: Boolean(filing?.ok && filing.latest_material) },
      { key: "news", label: "News (GDELT)", points: Math.min((news?.article_count || 0) * 2, 10), max: 10, present: (news?.article_count || 0) > 0 },
      { key: "matches", label: "Market matches", points: Math.min((marketRow?.match_count || 0) * 2, 10), max: 10, present: (marketRow?.match_count || 0) > 0 }
    ];
    const confidence = Math.min(95, scoreComponents.reduce((sum, component) => sum + component.points, 0));
    const signalCount = [
      topMarket,
      calendar?.ok,
      price?.ok,
      filing?.ok && filing.latest_material,
      (news?.article_count || 0) > 0
    ].filter(Boolean).length;
    const recommendation: StockRecommendation["recommendation"] =
      topMarket && marketDepthOk && stock.address && confidence >= 75
        ? "prepare_quote"
        : signalCount >= 2
          ? "watch"
          : "wait_for_cleaner_data";
    const action: DecisionAction =
      !kalshi.ok && !calendar?.ok && !price?.ok && !filing?.ok
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
    const priceSnapshot = price?.ok
      ? {
          close: price.close,
          date: price.date,
          volume: price.volume,
          source: price.source
        }
      : undefined;
    const latestFiling = filing?.latest_material
      ? {
          form: filing.latest_material.form,
          filing_date: filing.latest_material.filing_date,
          document_url: filing.latest_material.document_url
        }
      : undefined;
    const support = [
      priceSnapshot?.close ? `public quote close ${formatPrice(priceSnapshot.close)}${priceSnapshot.date ? ` on ${priceSnapshot.date}` : ""}${priceSnapshot.volume ? ` with ${priceSnapshot.volume.toLocaleString("en-US")} volume` : ""}` : "",
      latestFiling ? `SEC ${latestFiling.form}${latestFiling.filing_date ? ` filed ${latestFiling.filing_date}` : ""}` : "",
      news?.article_count ? `${news.article_count} recent GDELT article(s)` : "",
      marketPricing ? `Kalshi ${marketPricing.spread_note}` : ""
    ].filter(Boolean);
    const rationale =
      action === "CONFIG_NEEDED"
        ? "Required market or event sources are unavailable, so Hermes cannot form a clean Robinhood Chain stock-token recommendation."
        : recommendation === "prepare_quote"
        ? `Official Robinhood Chain route is confirmed. Supporting evidence: ${support.join("; ")}. Quote prep is allowed only after the wallet owner accepts the evidence and signing step.`.trim()
        : recommendation === "watch"
          ? `Official Robinhood Chain route is ready, but this stays WATCH because the evidence is not strong enough for a buy setup. Supporting evidence: ${support.join("; ") || "no clean public signal returned"}.`.trim()
          : "Official Robinhood Chain route is ready, but public market, filing, news, calendar, and Kalshi context is too thin for a buy setup right now.";
    const userAction =
      action === "CONFIG_NEEDED"
        ? "Fix the missing/degraded data source before presenting this as a buy recommendation."
        : recommendation === "prepare_quote"
        ? "Prepare a Robinhood Chain stock-token quote only if the user accepts the supporting evidence and wallet-signing step."
        : recommendation === "watch"
          ? "Keep the stock on watch. Do not ask the wallet to sign until the public price, filing, news, or Kalshi evidence creates a cleaner buy setup."
          : "Do not recommend buying this Robinhood Chain stock-token right now. Show route readiness only, and wait for cleaner supporting evidence.";

    return {
      symbol: stock.symbol,
      recommendation,
      action,
      label,
      confidence,
      score_breakdown: scoreComponents,
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
        price_snapshot: priceSnapshot,
        latest_filing: latestFiling,
        news_count: news?.article_count || 0,
        top_news: (news?.top_articles || []).slice(0, 3).map((article) => ({
          title: article.title,
          url: article.url,
          domain: article.domain
        })),
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
  stockSignals: Awaited<ReturnType<typeof fetchStockSignals>>,
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
  const priceCount = stockSignals.prices.filter((row) => row.ok).length;
  const filingCount = stockSignals.filings.filter((row) => row.ok && row.latest_material).length;
  const newsCount = stockSignals.news.reduce((count, row) => count + row.article_count, 0);
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
      : `Fetched ${kalshi.scanned_markets} public Kalshi market(s), ${priceCount} public quote(s), ${filingCount} SEC filing stream(s), and ${newsCount} GDELT article(s); none created a clean Robinhood Chain buy setup.`;
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
      score_breakdown: recommendation.score_breakdown,
      score_explanation: explainScoreBreakdown(recommendation.score_breakdown, recommendation.confidence),
      reason: recommendation.rationale,
      routeable: true,
      kalshi_match: recommendation.evidence.kalshi_match_count > 0,
      yes_no_prices: recommendation.evidence.market_pricing || null,
      price: recommendation.evidence.price_snapshot || null,
      latest_filing: recommendation.evidence.latest_filing || null,
      news_count: recommendation.evidence.news_count,
      user_action: recommendation.user_action
    }))
  };
}

type StockIntel = Awaited<ReturnType<typeof computeStockIntel>>;

const INTEL_CACHE_KEY = "stock_intel";
const intelCache = new Map<string, { expires: number; promise: Promise<StockIntel> }>();

function intelCacheTtlMs(): number {
  return timeoutMs("INTEL_CACHE_TTL_MS", 60000);
}

export async function buildStockIntel(options: { bypassCache?: boolean } = {}) {
  const ttl = intelCacheTtlMs();
  const now = Date.now();

  if (!options.bypassCache && ttl > 0) {
    const cached = intelCache.get(INTEL_CACHE_KEY);
    if (cached && cached.expires > now) {
      return cached.promise;
    }
  }

  const promise = computeStockIntel();

  if (ttl > 0) {
    intelCache.set(INTEL_CACHE_KEY, { expires: now + ttl, promise });
    // Evict on failure so a rejected fetch isn't served from cache.
    promise.catch(() => {
      if (intelCache.get(INTEL_CACHE_KEY)?.promise === promise) {
        intelCache.delete(INTEL_CACHE_KEY);
      }
    });
  }

  return promise;
}

async function computeStockIntel() {
  const [kalshi, calendars, explorerDiscovery, stockSignals] = await Promise.all([
    sourceTimeout(matchStockMarkets(robinhoodStockTokens), timeoutMs("KALSHI_SOURCE_TIMEOUT_MS", 30000), kalshiTimeoutFallback()),
    sourceTimeout(fetchStockCalendars(robinhoodStockTokens), timeoutMs("CALENDAR_SOURCE_TIMEOUT_MS", 15000), calendarTimeoutFallback()),
    sourceTimeout(discoverExplorerStockTokens(), timeoutMs("EXPLORER_SOURCE_TIMEOUT_MS", 6000), explorerTimeoutFallback()),
    sourceTimeout(fetchStockSignals(robinhoodStockTokens), timeoutMs("STOCK_SIGNALS_TIMEOUT_MS", 20000), stockSignalsTimeoutFallback())
  ]);
  const checks = buildPipelineChecks(kalshi, calendars, explorerDiscovery, stockSignals);
  const recommendations = buildStockRecommendations(kalshi, calendars, explorerDiscovery, stockSignals);
  const hermesDecision = buildHermesDecision(kalshi, stockSignals, recommendations);

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
    stock_signals: stockSignals,
    kalshi,
    calendars,
    recommendations,
    hermes_decision: hermesDecision,
    agent_context: buildAgentContext(kalshi, calendars, explorerDiscovery, stockSignals, recommendations, hermesDecision)
  };
}

export function compactStockIntel(intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  return {
    ok: intel.ok,
    timestamp: intel.timestamp,
    pipeline: intel.pipeline,
    robinhood_chain: {
      stock_count: intel.robinhood_chain.stock_count,
      payment_tokens: intel.robinhood_chain.payment_tokens,
      stocks: intel.robinhood_chain.stocks,
      source: intel.robinhood_chain.source
    },
    explorer_discovery: {
      ok: intel.explorer_discovery.ok,
      source: intel.explorer_discovery.source,
      stock_like_count: intel.explorer_discovery.stock_like_count,
      official_count: intel.explorer_discovery.official_count,
      other_count: intel.explorer_discovery.other_count,
      tokens: intel.explorer_discovery.tokens.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        trust_level: token.trust_level,
        routed_by_agent: token.routed_by_agent
      })),
      error: intel.explorer_discovery.error
    },
    stock_signals: {
      ok: intel.stock_signals.ok,
      source_note: intel.stock_signals.source_note,
      cached: intel.stock_signals.cached,
      prices: intel.stock_signals.prices,
      filings: intel.stock_signals.filings,
      news: intel.stock_signals.news.map((row) => ({
        ...row,
        top_articles: row.top_articles.slice(0, 2)
      }))
    },
    kalshi: {
      ok: intel.kalshi.ok,
      source: intel.kalshi.source,
      source_note: intel.kalshi.source_note,
      scanned_markets: intel.kalshi.scanned_markets,
      searched_terms: intel.kalshi.searched_terms,
      error: intel.kalshi.error,
      stocks: intel.kalshi.stocks.map((row) => ({
        stock: row.stock,
        match_count: row.match_count,
        markets: row.markets.slice(0, 3)
      }))
    },
    calendars: intel.calendars,
    recommendations: intel.recommendations,
    hermes_decision: intel.hermes_decision
  };
}
