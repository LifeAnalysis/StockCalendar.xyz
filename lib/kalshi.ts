import { env } from "./env";
import { fetchJson } from "./http";
import { RobinhoodToken, robinhoodStockTokens } from "./robinhood";

const KALSHI_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";
const KALSHI_SOURCE_NOTE =
  "Kalshi website search is not used as a data source; Hermes scans the public Trade API market feed and filters locally by Robinhood stock symbols and company keywords.";

export type KalshiMarket = {
  ticker: string;
  event_ticker?: string;
  series_ticker?: string;
  series_title?: string;
  series_category?: string;
  series_tags?: string[];
  series_settlement_sources?: string[];
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

type KalshiSeries = {
  ticker: string;
  title?: string;
  category?: string;
  tags?: string[] | null;
  settlement_sources?: Array<{ name?: string; url?: string }>;
};

type SeriesResponse = {
  series?: KalshiSeries[];
};

type CacheEntry<T> = {
  ts: number;
  value: T;
  key: string;
};

type MarketFeed = {
  ok: boolean;
  markets: KalshiMarket[];
  scanned_markets: number;
  error?: string;
  source: string;
  source_note: string;
  search_method: "public_markets_feed" | "public_markets_keyword_scan";
  searched_terms: string[];
};

let marketCache: CacheEntry<KalshiMarket[]> | null = null;
let targetedMarketCache: CacheEntry<MarketFeed> | null = null;
let seriesCache: CacheEntry<KalshiSeries[]> | null = null;
let directSeriesCache: CacheEntry<Record<string, KalshiSeries | null>> | null = null;

function kalshiBaseUrl(): string {
  return env("KALSHI_API_BASE_URL", KALSHI_BASE_URL).replace(/\/$/, "");
}

function marketText(market: KalshiMarket): string {
  return [
    market.ticker,
    market.event_ticker,
    market.series_ticker,
    market.series_title,
    market.series_category,
    ...(market.series_tags || []),
    ...(market.series_settlement_sources || []),
    market.title,
    market.yes_sub_title,
    market.no_sub_title,
    market.rules_primary
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function seriesText(series: KalshiSeries): string {
  return [
    series.ticker,
    series.title,
    series.category,
    ...(series.tags || []),
    ...(series.settlement_sources || []).map((source) => source.name)
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
  const tickerText = [market.ticker, market.event_ticker, market.series_ticker].filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  if (tickerText.includes(stock.symbol.toLowerCase())) score += 8;
  if (new RegExp(`\\b${escapeRegExp(stock.symbol.toLowerCase())}\\b`).test(text)) score += 8;
  for (const alias of stock.aliases) {
    const normalizedAlias = alias.toLowerCase();
    const aliasMatches =
      normalizedAlias.length <= 4
        ? new RegExp(`\\b${escapeRegExp(normalizedAlias)}\\b`).test(text)
        : text.includes(normalizedAlias);
    if (aliasMatches) score += normalizedAlias === stock.symbol.toLowerCase() ? 4 : 3;
  }
  if (
    /earnings|earnings call|revenue|profit|eps|stock price|market cap|share price|close above|close below|kpi|deliveries|production|customers|subscribers|layoffs|price increase|ceo|tariff/.test(text)
  ) {
    score += 3;
  }
  if (/nba|mlb|nfl|weather|pope|mars|election/.test(text)) score -= 4;
  return score;
}

function maxKalshiPages(): number {
  const value = Number(env("KALSHI_MAX_MARKET_PAGES", "12"));
  return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 40)) : 12;
}

export async function fetchKalshiMarkets(maxPages = maxKalshiPages()): Promise<{
  ok: boolean;
  markets: KalshiMarket[];
  scanned_markets: number;
  error?: string;
  source: string;
  source_note: string;
}> {
  const configuredTtl = Number(env("KALSHI_MARKET_CACHE_SECONDS", "180"));
  const ttlMs = (Number.isFinite(configuredTtl) ? Math.max(0, configuredTtl) : 180) * 1000;
  const cacheKey = String(maxPages);
  if (marketCache && marketCache.key === cacheKey && Date.now() - marketCache.ts < ttlMs) {
    return {
      ok: true,
      markets: marketCache.value,
      scanned_markets: marketCache.value.length,
      source: "cache",
      source_note: KALSHI_SOURCE_NOTE
    };
  }

  const markets: KalshiMarket[] = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ limit: "1000", status: "open" });
    if (cursor) params.set("cursor", cursor);
    const response = await fetchJson<MarketsResponse>(`${kalshiBaseUrl()}/markets?${params.toString()}`, { timeoutMs: 25000 });
    if (!response.ok || !response.data) {
      return {
        ok: false,
        markets,
        scanned_markets: markets.length,
        error: response.error || JSON.stringify(response.data || {}),
        source: kalshiBaseUrl(),
        source_note: KALSHI_SOURCE_NOTE
      };
    }
    markets.push(...(response.data.markets || []));
    cursor = response.data.cursor || "";
    if (!cursor) break;
  }

  marketCache = { ts: Date.now(), value: markets, key: cacheKey };
  return {
    ok: true,
    markets,
    scanned_markets: markets.length,
    source: `${kalshiBaseUrl()}/markets`,
    source_note: KALSHI_SOURCE_NOTE
  };
}

async function fetchKalshiSeries(): Promise<{
  ok: boolean;
  series: KalshiSeries[];
  error?: string;
}> {
  const configuredTtl = Number(env("KALSHI_MARKET_CACHE_SECONDS", "180"));
  const ttlMs = (Number.isFinite(configuredTtl) ? Math.max(0, configuredTtl) : 180) * 1000;
  if (seriesCache && Date.now() - seriesCache.ts < ttlMs) {
    return { ok: true, series: seriesCache.value };
  }

  const response = await fetchJson<SeriesResponse>(`${kalshiBaseUrl()}/series?status=open`, {
    timeoutMs: Number(env("KALSHI_SOURCE_TIMEOUT_MS", "30000")) || 30000
  });
  if (!response.ok || !response.data) {
    return { ok: false, series: [], error: response.error || JSON.stringify(response.data || {}) };
  }

  const series = response.data.series || [];
  seriesCache = { ts: Date.now(), value: series, key: "open" };
  return { ok: true, series };
}

function stockSearchQueries(stocks: RobinhoodToken[]): string[] {
  const maxTerms = Number(env("KALSHI_MAX_SEARCH_TERMS", "32"));
  return Array.from(
    new Set(
      stocks.flatMap((stock) => [
        stock.symbol,
        stock.name,
        ...stock.aliases
      ])
    )
  ).slice(0, Number.isFinite(maxTerms) ? Math.max(1, Math.trunc(maxTerms)) : 32);
}

function maxSeriesPerStock(): number {
  const value = Number(env("KALSHI_MAX_SERIES_PER_STOCK", "4"));
  return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 12)) : 4;
}

function marketMatchesSearchTerm(market: KalshiMarket, term: string): boolean {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return false;
  const text = marketText(market);
  return normalizedTerm.length <= 4
    ? new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`).test(text)
    : text.includes(normalizedTerm);
}

function seriesMatchesSearchTerm(series: KalshiSeries, term: string): boolean {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return false;
  const text = seriesText(series);
  return normalizedTerm.length <= 4
    ? new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`).test(text)
    : text.includes(normalizedTerm);
}

function stockRelevantSeries(series: KalshiSeries): boolean {
  const category = (series.category || "").toLowerCase();
  const tags = (series.tags || []).join(" ").toLowerCase();
  if (/(companies|financials|economics|mentions|science and technology)/.test(category)) return true;
  return /\b(kpi|earnings|ceo|m&a|product launches|big tech|jobs)/.test(tags);
}

function scoreSeries(stock: RobinhoodToken, series: KalshiSeries): number {
  const text = seriesText(series);
  const tickerText = series.ticker.toLowerCase();
  let score = 0;
  if (tickerText.includes(stock.symbol.toLowerCase())) score += 10;
  if (new RegExp(`\\b${escapeRegExp(stock.symbol.toLowerCase())}\\b`).test(text)) score += 10;
  if (text.includes(stock.name.toLowerCase())) score += 8;
  for (const alias of stock.aliases) {
    const normalizedAlias = alias.toLowerCase();
    if (
      normalizedAlias.length <= 4
        ? new RegExp(`\\b${escapeRegExp(normalizedAlias)}\\b`).test(text)
        : text.includes(normalizedAlias)
    ) {
      score += 4;
    }
  }
  if (/(companies|financials)/.test((series.category || "").toLowerCase())) score += 3;
  if (/\b(kpi|earnings|ceo|m&a|product launches)\b/.test((series.tags || []).join(" ").toLowerCase())) score += 3;
  if (/(music|movie|tv|television|sports|ranking|rank)/.test(text)) score -= 5;
  return score;
}

function annotateMarketWithSeries(market: KalshiMarket, series: KalshiSeries): KalshiMarket {
  return {
    ...market,
    series_title: series.title,
    series_category: series.category,
    series_tags: series.tags || undefined,
    series_settlement_sources: (series.settlement_sources || [])
      .map((source) => source.name)
      .filter((name): name is string => Boolean(name))
  };
}

function targetedKalshiPages(): number {
  const configured = Number(env("KALSHI_TARGETED_MARKET_PAGES", "0"));
  return Number.isFinite(configured) ? Math.max(0, Math.min(Math.trunc(configured), 40)) : 0;
}

function shouldScanSeries(): boolean {
  return env("KALSHI_USE_SERIES_SCAN", "true") !== "false";
}

function shouldScanSeriesCatalog(): boolean {
  return env("KALSHI_USE_SERIES_CATALOG_SCAN", "false") === "true";
}

function maxSearchRequests(): number {
  const value = Number(env("KALSHI_MAX_SEARCH_REQUESTS", "12"));
  return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 32)) : 12;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchSeriesMarkets(series: KalshiSeries): Promise<KalshiMarket[]> {
  const markets: KalshiMarket[] = [];
  let seriesCursor = "";
  for (let page = 0; page < 2; page += 1) {
    const params = new URLSearchParams({ limit: "1000", status: "open", series_ticker: series.ticker });
    if (seriesCursor) params.set("cursor", seriesCursor);
    const response = await fetchJson<MarketsResponse>(`${kalshiBaseUrl()}/markets?${params.toString()}`, { timeoutMs: 10000 });
    if (!response.ok || !response.data) break;

    markets.push(...(response.data.markets || []).map((market) => annotateMarketWithSeries(market, series)));
    seriesCursor = response.data.cursor || "";
    if (!seriesCursor) break;
  }
  return markets;
}

function stockSeriesTicker(stock: RobinhoodToken) {
  return `KX${stock.symbol.toUpperCase()}`;
}

async function fetchDirectStockSeries(stocks: RobinhoodToken[]): Promise<{
  series: KalshiSeries[];
  errors: string[];
}> {
  const configuredTtl = Number(env("KALSHI_MARKET_CACHE_SECONDS", "180"));
  const ttlMs = (Number.isFinite(configuredTtl) ? Math.max(0, configuredTtl) : 180) * 1000;
  const cacheKey = stocks.map((stock) => stock.symbol).join("|");
  const cacheValue = directSeriesCache && directSeriesCache.key === cacheKey && Date.now() - directSeriesCache.ts < ttlMs
    ? directSeriesCache.value
    : null;
  const values: Record<string, KalshiSeries | null> = cacheValue ? { ...cacheValue } : {};
  const missing = stocks.filter((stock) => !(stock.symbol in values));
  const errors: string[] = [];

  const responses = await mapWithConcurrency(missing, 4, async (stock) => {
    const ticker = stockSeriesTicker(stock);
    const response = await fetchJson<{ series?: KalshiSeries }>(`${kalshiBaseUrl()}/series/${ticker}`, {
      timeoutMs: Number(env("KALSHI_SOURCE_TIMEOUT_MS", "30000")) || 30000
    });
    return { stock, ticker, response };
  });

  for (const { stock, ticker, response } of responses) {
    if (response.ok && response.data?.series) {
      values[stock.symbol] = response.data.series;
    } else {
      values[stock.symbol] = null;
      const error = response.error || `status ${response.status}`;
      if (!/not_found|404/i.test(error)) errors.push(`${ticker}: ${error}`);
    }
  }

  directSeriesCache = { ts: Date.now(), value: values, key: cacheKey };
  return {
    series: Object.values(values).filter((series): series is KalshiSeries => Boolean(series)),
    errors
  };
}

async function fetchSearchMarkets(terms: string[]): Promise<{
  markets: KalshiMarket[];
  scanned_markets: number;
  errors: string[];
}> {
  const marketsByTicker = new Map<string, KalshiMarket>();
  const errors: string[] = [];
  const termsToFetch = terms.slice(0, maxSearchRequests());
  const responses = await mapWithConcurrency(termsToFetch, 4, async (term) => {
    const params = new URLSearchParams({ limit: "100", status: "open", search: term });
    return fetchJson<MarketsResponse>(`${kalshiBaseUrl()}/markets?${params.toString()}`, {
      timeoutMs: Number(env("KALSHI_SOURCE_TIMEOUT_MS", "30000")) || 30000
    });
  });

  for (const response of responses) {
    if (!response.ok || !response.data) {
      errors.push(response.error || `status ${response.status}`);
      continue;
    }
    for (const market of response.data.markets || []) {
      if (market.ticker) marketsByTicker.set(market.ticker, market);
    }
  }

  return {
    markets: Array.from(marketsByTicker.values()),
    scanned_markets: Array.from(marketsByTicker.values()).length,
    errors
  };
}

async function fetchTargetedKalshiMarkets(stocks: RobinhoodToken[]): Promise<MarketFeed> {
  const searchedTerms = stockSearchQueries(stocks);
  const pageCount = targetedKalshiPages();
  const includeSeries = shouldScanSeries();
  const cacheKey = `${pageCount}:${includeSeries ? "series" : "feed"}:${searchedTerms.join("|").toLowerCase()}`;
  const configuredTtl = Number(env("KALSHI_MARKET_CACHE_SECONDS", "180"));
  const ttlMs = (Number.isFinite(configuredTtl) ? Math.max(0, configuredTtl) : 180) * 1000;
  if (targetedMarketCache && targetedMarketCache.key === cacheKey && Date.now() - targetedMarketCache.ts < ttlMs) {
    return { ...targetedMarketCache.value, source: "cache" };
  }

  const marketsByTicker = new Map<string, KalshiMarket>();
  let scannedMarkets = 0;
  let seriesError = "";
  if (includeSeries) {
    const directSeries = await fetchDirectStockSeries(stocks);
    seriesError = directSeries.errors.join("; ");
    const seriesByTicker = new Map<string, KalshiSeries>();
    for (const series of directSeries.series) {
      seriesByTicker.set(series.ticker, series);
    }

    if (shouldScanSeriesCatalog()) {
      const seriesFeed = await fetchKalshiSeries();
      seriesError = [seriesError, seriesFeed.error || ""].filter(Boolean).join("; ");
      for (const stock of stocks) {
        const stockTerms = stockSearchQueries([stock]);
        const matchedSeries = seriesFeed.series
          .filter((series) => stockRelevantSeries(series))
          .filter((series) => stockTerms.some((term) => seriesMatchesSearchTerm(series, term)))
          .map((series) => ({ series, score: scoreSeries(stock, series) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, maxSeriesPerStock());

        for (const { series } of matchedSeries) {
          seriesByTicker.set(series.ticker, series);
        }
      }
    }

    const seriesMarketGroups = await mapWithConcurrency(Array.from(seriesByTicker.values()), 4, fetchSeriesMarkets);
    for (const markets of seriesMarketGroups) {
      for (const market of markets) {
        scannedMarkets += 1;
        marketsByTicker.set(market.ticker, market);
      }
    }
  }

  if (seriesError && marketsByTicker.size === 0) {
    const searchFeed = await fetchSearchMarkets(searchedTerms);
    for (const market of searchFeed.markets) {
      marketsByTicker.set(market.ticker, market);
    }
    scannedMarkets += searchFeed.scanned_markets;
    if (marketsByTicker.size > 0) {
      seriesError = "";
    } else if (searchFeed.errors.length) {
      seriesError = `${seriesError}; Market search fallback error: ${searchFeed.errors.join("; ")}`;
    }
  }

  let cursor = "";
  for (let page = 0; page < pageCount; page += 1) {
    const params = new URLSearchParams({ limit: "1000", status: "open" });
    if (cursor) params.set("cursor", cursor);
    const response = await fetchJson<MarketsResponse>(`${kalshiBaseUrl()}/markets?${params.toString()}`, { timeoutMs: 25000 });
    if (!response.ok || !response.data) {
      const value: MarketFeed = {
        ok: false,
        markets: Array.from(marketsByTicker.values()),
        scanned_markets: scannedMarkets,
        error: response.error || JSON.stringify(response.data || {}),
        source: kalshiBaseUrl(),
        search_method: "public_markets_keyword_scan",
        source_note: seriesError ? `${KALSHI_SOURCE_NOTE} Series catalog error: ${seriesError}` : KALSHI_SOURCE_NOTE,
        searched_terms: searchedTerms
      };
      if (value.markets.length > 0 || value.scanned_markets > 0) {
        targetedMarketCache = { ts: Date.now(), value, key: cacheKey };
      }
      return value;
    }

    for (const market of response.data.markets || []) {
      scannedMarkets += 1;
      if (searchedTerms.some((term) => marketMatchesSearchTerm(market, term))) {
        marketsByTicker.set(market.ticker, market);
      }
    }
    cursor = response.data.cursor || "";
    if (!cursor) break;
  }

  const value: MarketFeed = {
    ok: !seriesError || marketsByTicker.size > 0 || scannedMarkets > 0,
    markets: Array.from(marketsByTicker.values()),
    scanned_markets: scannedMarkets,
    error: seriesError && marketsByTicker.size === 0 && scannedMarkets === 0 ? seriesError : undefined,
    source: `${kalshiBaseUrl()}${includeSeries ? "/series + " : ""}/markets keyword-scan`,
    search_method: "public_markets_keyword_scan",
    source_note: seriesError ? `${KALSHI_SOURCE_NOTE} Series catalog error: ${seriesError}` : KALSHI_SOURCE_NOTE,
    searched_terms: searchedTerms
  };
  if (value.ok || value.markets.length > 0 || value.scanned_markets > 0) {
    targetedMarketCache = { ts: Date.now(), value, key: cacheKey };
  }
  return value;
}

export async function matchStockMarkets(stocks = robinhoodStockTokens) {
  const feed =
    env("KALSHI_USE_BROAD_SCAN", "") === "true"
      ? { ...(await fetchKalshiMarkets()), search_method: "public_markets_feed" as const, searched_terms: [] }
      : await fetchTargetedKalshiMarkets(stocks);
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
        volume_fp: market.volume_fp,
        rules_primary: market.rules_primary,
        status: market.status
      }))
    };
  });

  return {
    ok: feed.ok,
    source: feed.source,
    error: feed.error,
    scanned_markets: feed.scanned_markets,
    search_method: feed.search_method,
    source_note: feed.source_note,
    searched_terms: feed.searched_terms,
    stocks: bySymbol
  };
}
