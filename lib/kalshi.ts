import { env } from "./env";
import { fetchJson } from "./http";
import { RobinhoodToken, robinhoodStockTokens } from "./robinhood";

const KALSHI_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";

export type KalshiMarket = {
  ticker: string;
  event_ticker?: string;
  series_ticker?: string;
  title?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  status?: string;
  close_time?: string;
  expected_expiration_time?: string;
  liquidity_dollars?: string;
  volume_24h_fp?: string;
  volume_fp?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  no_bid_dollars?: string;
  no_ask_dollars?: string;
  rules_primary?: string;
  category?: string;
};

type MarketsResponse = {
  cursor?: string;
  markets?: KalshiMarket[];
};

type CacheEntry<T> = {
  ts: number;
  value: T;
};

let marketCache: CacheEntry<KalshiMarket[]> | null = null;

function kalshiBaseUrl(): string {
  return env("KALSHI_API_BASE_URL", KALSHI_BASE_URL).replace(/\/$/, "");
}

function marketText(market: KalshiMarket): string {
  return [
    market.ticker,
    market.event_ticker,
    market.series_ticker,
    market.title,
    market.yes_sub_title,
    market.no_sub_title,
    market.rules_primary
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreMarket(stock: RobinhoodToken, market: KalshiMarket): number {
  const text = marketText(market);
  let score = 0;
  if (new RegExp(`\\b${escapeRegExp(stock.symbol.toLowerCase())}\\b`).test(text)) score += 8;
  for (const alias of stock.aliases) {
    if (text.includes(alias.toLowerCase())) score += alias === stock.symbol.toLowerCase() ? 4 : 3;
  }
  if (/earnings|revenue|profit|eps|stock price|market cap|share price|close above|close below/.test(text)) score += 3;
  if (/nba|mlb|nfl|weather|pope|mars|election/.test(text)) score -= 4;
  return score;
}

function maxKalshiPages(): number {
  const value = Number(env("KALSHI_MAX_MARKET_PAGES", "12"));
  return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 40)) : 12;
}

export async function fetchKalshiMarkets(maxPages = maxKalshiPages()): Promise<{ ok: boolean; markets: KalshiMarket[]; error?: string; source: string }> {
  const configuredTtl = Number(env("KALSHI_MARKET_CACHE_SECONDS", "180"));
  const ttlMs = (Number.isFinite(configuredTtl) ? Math.max(0, configuredTtl) : 180) * 1000;
  if (marketCache && Date.now() - marketCache.ts < ttlMs) {
    return { ok: true, markets: marketCache.value, source: "cache" };
  }

  const markets: KalshiMarket[] = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ limit: "1000", status: "open" });
    if (cursor) params.set("cursor", cursor);
    const response = await fetchJson<MarketsResponse>(`${kalshiBaseUrl()}/markets?${params.toString()}`, { timeoutMs: 25000 });
    if (!response.ok || !response.data) {
      return { ok: false, markets, error: response.error || JSON.stringify(response.data || {}), source: kalshiBaseUrl() };
    }
    markets.push(...(response.data.markets || []));
    cursor = response.data.cursor || "";
    if (!cursor) break;
  }

  marketCache = { ts: Date.now(), value: markets };
  return { ok: true, markets, source: `${kalshiBaseUrl()}/markets` };
}

export async function matchStockMarkets(stocks = robinhoodStockTokens) {
  const feed = await fetchKalshiMarkets();
  const bySymbol = stocks.map((stock) => {
    const matches = feed.markets
      .map((market) => ({ market, score: scoreMarket(stock, market) }))
      .filter((item) => item.score >= 5)
      .sort((a, b) => {
        const liquidityDelta = Number(b.market.liquidity_dollars || 0) - Number(a.market.liquidity_dollars || 0);
        return b.score - a.score || liquidityDelta;
      })
      .slice(0, 8);

    return {
      stock,
      match_count: matches.length,
      markets: matches.map(({ market, score }) => ({
        score,
        ticker: market.ticker,
        event_ticker: market.event_ticker,
        title: market.title,
        yes_bid_dollars: market.yes_bid_dollars,
        yes_ask_dollars: market.yes_ask_dollars,
        no_bid_dollars: market.no_bid_dollars,
        no_ask_dollars: market.no_ask_dollars,
        close_time: market.close_time,
        expected_expiration_time: market.expected_expiration_time,
        liquidity_dollars: market.liquidity_dollars,
        volume_24h_fp: market.volume_24h_fp,
        status: market.status
      }))
    };
  });

  return {
    ok: feed.ok,
    source: feed.source,
    error: feed.error,
    scanned_markets: feed.markets.length,
    stocks: bySymbol
  };
}
