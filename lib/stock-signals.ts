import { env } from "./env";
import { fetchJson, fetchText } from "./http";
import { RobinhoodToken, robinhoodStockTokens } from "./robinhood";

type StooqCsvRow = {
  Symbol?: string;
  Date?: string;
  Time?: string;
  Open?: string;
  High?: string;
  Low?: string;
  Close?: string;
  Volume?: string;
};

type SecSubmissions = {
  name?: string;
  cik?: string;
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
      primaryDocDescription?: string[];
    };
  };
};

type GdeltResponse = {
  articles?: Array<{
    title?: string;
    url?: string;
    domain?: string;
    seendate?: string;
    sourcecountry?: string;
    language?: string;
  }>;
};

type YahooSearchResponse = {
  news?: Array<{
    title?: string;
    link?: string;
    publisher?: string;
    providerPublishTime?: number;
    relatedTickers?: string[];
  }>;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
};

export type PriceSnapshot = {
  symbol: string;
  ok: boolean;
  source: string;
  date?: string;
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  error?: string;
};

export type ChartPoint = {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
};

export type ChartSnapshot = {
  symbol: string;
  ok: boolean;
  source: string;
  range: string;
  interval: string;
  data: ChartPoint[];
  error?: string;
};

export type FilingSnapshot = {
  symbol: string;
  ok: boolean;
  source: string;
  company?: string;
  cik?: string;
  latest_material?: {
    form: string;
    filing_date?: string;
    report_date?: string;
    accession_number?: string;
    document_url?: string;
    description?: string;
  };
  recent_material_count: number;
  recent_forms: string[];
  error?: string;
};

export type NewsSnapshot = {
  symbol: string;
  ok: boolean;
  source: string;
  article_count: number;
  top_articles: Array<{
    title: string;
    url?: string;
    domain?: string;
    seen_date?: string;
  }>;
  error?: string;
};

export type StockSignals = {
  ok: boolean;
  source_note: string;
  cached?: boolean;
  prices: PriceSnapshot[];
  filings: FilingSnapshot[];
  news: NewsSnapshot[];
};

const STOOQ_SOURCE = "https://stooq.com/q/l/";
const YAHOO_CHART_SOURCE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const SEC_SOURCE = "https://data.sec.gov/submissions/";
const GDELT_SOURCE = "https://api.gdeltproject.org/api/v2/doc/doc";
const YAHOO_SEARCH_SOURCE = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_RSS_SOURCE = "https://feeds.finance.yahoo.com/rss/2.0/headline";

let stockSignalsCache: { ts: number; key: string; value: StockSignals } | null = null;

function cacheTtlMs(): number {
  const value = Number(env("STOCK_SIGNALS_CACHE_SECONDS", "300"));
  return (Number.isFinite(value) ? Math.max(0, value) : 300) * 1000;
}

function parseNumber(value?: string): number | undefined {
  if (!value || value === "N/D") return undefined;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsv(text: string): StooqCsvRow | null {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",");
  const values = lines[1].split(",");
  return headers.reduce<StooqCsvRow>((row, header, index) => {
    row[header as keyof StooqCsvRow] = values[index];
    return row;
  }, {});
}

async function fetchPrice(stock: RobinhoodToken): Promise<PriceSnapshot> {
  const symbol = `${stock.symbol.toLowerCase()}.us`;
  const url = `${STOOQ_SOURCE}?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  const response = await fetchText(url, { timeoutMs: Number(env("STOOQ_TIMEOUT_MS", "6000")) || 6000 });
  if (response.ok) {
    const row = parseCsv(response.text);
    if (row && row.Close !== "N/D") {
      return {
        symbol: stock.symbol,
        ok: true,
        source: STOOQ_SOURCE,
        date: row.Date,
        time: row.Time,
        open: parseNumber(row.Open),
        high: parseNumber(row.High),
        low: parseNumber(row.Low),
        close: parseNumber(row.Close),
        volume: parseNumber(row.Volume)
      };
    }
  }

  return fetchYahooPrice(stock, response.error || "stooq_quote_unavailable");
}

function lastNumber(values?: Array<number | null>): number | undefined {
  if (!values?.length) return undefined;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function dateFromUnix(value?: number, includeTime = false): string | undefined {
  if (!value) return undefined;
  const iso = new Date(value * 1000).toISOString();
  return includeTime ? iso : iso.slice(0, 10);
}

async function fetchYahooPrice(stock: RobinhoodToken, stooqError: string): Promise<PriceSnapshot> {
  const url = `${YAHOO_CHART_SOURCE}${encodeURIComponent(stock.symbol)}?range=5d&interval=1d`;
  const response = await fetchJson<YahooChartResponse>(url, {
    timeoutMs: Number(env("YAHOO_CHART_TIMEOUT_MS", "6000")) || 6000
  });
  const result = response.data?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const close = lastNumber(quote?.close) ?? result?.meta?.regularMarketPrice ?? result?.meta?.previousClose;
  if (!response.ok || !result || typeof close !== "number") {
    return {
      symbol: stock.symbol,
      ok: false,
      source: `${STOOQ_SOURCE} + ${YAHOO_CHART_SOURCE}`,
      error: response.error || stooqError || "quote_unavailable"
    };
  }

  const lastTimestamp = result.timestamp?.[result.timestamp.length - 1];
  return {
    symbol: stock.symbol,
    ok: true,
    source: YAHOO_CHART_SOURCE,
    date: dateFromUnix(lastTimestamp),
    open: lastNumber(quote?.open),
    high: lastNumber(quote?.high),
    low: lastNumber(quote?.low),
    close,
    volume: lastNumber(quote?.volume)
  };
}

function numberAt(values: Array<number | null> | undefined, index: number): number | undefined {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function fetchYahooChart(
  stock: RobinhoodToken,
  range = env("YAHOO_CHART_RANGE", "3mo"),
  interval = env("YAHOO_CHART_INTERVAL", "1d")
): Promise<ChartSnapshot> {
  const source = `${YAHOO_CHART_SOURCE}${encodeURIComponent(stock.symbol)}`;
  const url = `${source}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const response = await fetchJson<YahooChartResponse>(url, {
    timeoutMs: Number(env("YAHOO_CHART_TIMEOUT_MS", "6000")) || 6000
  });
  const result = response.data?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp || [];
  const data: ChartPoint[] = timestamps
    .map((timestamp, index): ChartPoint | null => {
      const close = numberAt(quote?.close, index);
      if (typeof close !== "number") return null;
      return {
        date: dateFromUnix(timestamp, interval !== "1d" && interval !== "1wk" && interval !== "1mo") || new Date(timestamp * 1000).toISOString(),
        open: numberAt(quote?.open, index),
        high: numberAt(quote?.high, index),
        low: numberAt(quote?.low, index),
        close,
        volume: numberAt(quote?.volume, index)
      };
    })
    .filter((point): point is ChartPoint => point !== null);

  if (!response.ok || !result || !data.length) {
    return {
      symbol: stock.symbol,
      ok: false,
      source: YAHOO_CHART_SOURCE,
      range,
      interval,
      data: [],
      error: response.error || "yahoo_chart_unavailable"
    };
  }

  return {
    symbol: stock.symbol,
    ok: true,
    source: YAHOO_CHART_SOURCE,
    range,
    interval,
    data
  };
}

function secUserAgent(): string {
  return env("SEC_USER_AGENT", "hermes-agent-backend/2.0 contact@lifeanalysis.local");
}

function secDocumentUrl(cik: string, accessionNumber?: string, document?: string): string | undefined {
  if (!accessionNumber || !document) return undefined;
  const compactCik = String(Number(cik));
  const compactAccession = accessionNumber.replaceAll("-", "");
  return `https://www.sec.gov/Archives/edgar/data/${compactCik}/${compactAccession}/${document}`;
}

async function fetchFiling(stock: RobinhoodToken): Promise<FilingSnapshot> {
  if (!stock.secCik) {
    return { symbol: stock.symbol, ok: false, source: SEC_SOURCE, recent_material_count: 0, recent_forms: [], error: "missing_sec_cik" };
  }

  const url = `${SEC_SOURCE}CIK${stock.secCik}.json`;
  const response = await fetchJson<SecSubmissions>(url, {
    timeoutMs: Number(env("SEC_TIMEOUT_MS", "8000")) || 8000,
    headers: { "User-Agent": secUserAgent() }
  });
  if (!response.ok || !response.data) {
    return {
      symbol: stock.symbol,
      ok: false,
      source: SEC_SOURCE,
      cik: stock.secCik,
      recent_material_count: 0,
      recent_forms: [],
      error: response.error || "sec_request_failed"
    };
  }

  const recent = response.data.filings?.recent;
  const filings = (recent?.form || []).map((form, index) => ({
    form,
    filing_date: recent?.filingDate?.[index],
    report_date: recent?.reportDate?.[index],
    accession_number: recent?.accessionNumber?.[index],
    primary_document: recent?.primaryDocument?.[index],
    description: recent?.primaryDocDescription?.[index]
  }));
  const material = filings.filter((filing) => /^(10-K|10-Q|8-K)$/i.test(filing.form)).slice(0, 8);
  const latest = material[0];

  return {
    symbol: stock.symbol,
    ok: true,
    source: SEC_SOURCE,
    company: response.data.name,
    cik: stock.secCik,
    latest_material: latest
      ? {
          form: latest.form,
          filing_date: latest.filing_date,
          report_date: latest.report_date,
          accession_number: latest.accession_number,
          document_url: secDocumentUrl(stock.secCik, latest.accession_number, latest.primary_document),
          description: latest.description
        }
      : undefined,
    recent_material_count: material.length,
    recent_forms: material.map((filing) => filing.form)
  };
}

function articleMatchesStock(stock: RobinhoodToken, title = ""): boolean {
  const text = title.toLowerCase();
  return stock.aliases.some((alias) => text.includes(alias.toLowerCase())) || text.includes(stock.name.toLowerCase());
}

function timestampToIso(value?: number): string | undefined {
  return value ? new Date(value * 1000).toISOString() : undefined;
}

function xmlText(value = ""): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function domainFromUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function parseYahooRss(text: string, stock: RobinhoodToken): NewsSnapshot["top_articles"] {
  const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items
    .map((item) => {
      const description = xmlText(/<description>([\s\S]*?)<\/description>/i.exec(item)?.[1] || "");
      return { item, description };
    })
    .filter(({ item, description }) => articleMatchesStock(stock, `${item} ${description}`))
    .slice(0, 4)
    .map(({ item }) => {
      const title = xmlText(/<title>([\s\S]*?)<\/title>/i.exec(item)?.[1] || "Untitled article");
      const url = xmlText(/<link>([\s\S]*?)<\/link>/i.exec(item)?.[1] || "");
      const pubDate = xmlText(/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(item)?.[1] || "");
      const parsedDate = pubDate ? new Date(pubDate) : null;
      return {
        title,
        url: url || undefined,
        domain: domainFromUrl(url),
        seen_date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined
      };
    });
}

async function fetchYahooNews(stock: RobinhoodToken): Promise<NewsSnapshot> {
  const rssParams = new URLSearchParams({
    s: stock.symbol,
    region: "US",
    lang: "en-US"
  });
  const rssResponse = await fetchText(`${YAHOO_RSS_SOURCE}?${rssParams.toString()}`, {
    headers: {
      Accept: "application/rss+xml,text/xml,*/*",
      "User-Agent": "Mozilla/5.0 hermes-next-agent/2.0"
    },
    timeoutMs: Number(env("YAHOO_NEWS_TIMEOUT_MS", "6000")) || 6000
  });
  if (rssResponse.ok) {
    const articles = parseYahooRss(rssResponse.text, stock);
    if (articles.length) {
      return {
        symbol: stock.symbol,
        ok: true,
        source: YAHOO_RSS_SOURCE,
        article_count: articles.length,
        top_articles: articles
      };
    }
  }

  const params = new URLSearchParams({
    q: `${stock.symbol} stock`,
    newsCount: env("YAHOO_NEWS_COUNT", "6"),
    quotesCount: "1"
  });
  const response = await fetchJson<YahooSearchResponse>(`${YAHOO_SEARCH_SOURCE}?${params.toString()}`, {
    timeoutMs: Number(env("YAHOO_NEWS_TIMEOUT_MS", "6000")) || 6000
  });
  if (!response.ok || !response.data?.news) {
    return {
      symbol: stock.symbol,
      ok: false,
      source: YAHOO_SEARCH_SOURCE,
      article_count: 0,
      top_articles: [],
      error: rssResponse.error || response.error || "yahoo_news_unavailable"
    };
  }

  const articles = response.data.news
    .filter((article) => article.relatedTickers?.includes(stock.symbol) || articleMatchesStock(stock, article.title))
    .slice(0, 4)
    .map((article) => ({
      title: article.title || "Untitled article",
      url: article.link,
      domain: article.publisher,
      seen_date: timestampToIso(article.providerPublishTime)
    }));

  return {
    symbol: stock.symbol,
    ok: true,
    source: YAHOO_SEARCH_SOURCE,
    article_count: articles.length,
    top_articles: articles
  };
}

async function fetchNews(stocks: RobinhoodToken[]): Promise<NewsSnapshot[]> {
  const base = stocks.map((stock) => ({
    symbol: stock.symbol,
    ok: false,
    source: GDELT_SOURCE,
    article_count: 0,
    top_articles: [] as NewsSnapshot["top_articles"]
  }));
  const query = `(${stocks.map((stock) => stock.aliases[0] || stock.name).join(" OR ")}) stock`;
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: env("GDELT_MAX_RECORDS", "25"),
    sort: "HybridRel"
  });
  const response = await fetchJson<GdeltResponse>(`${GDELT_SOURCE}?${params.toString()}`, {
    timeoutMs: Number(env("GDELT_TIMEOUT_MS", "6000")) || 6000
  });
  if (!response.ok || !response.data?.articles) {
    const yahooFallback = await Promise.all(stocks.map((stock) => fetchYahooNews(stock)));
    if (yahooFallback.some((row) => row.ok && row.article_count > 0)) {
      return yahooFallback;
    }
    return base.map((row) => ({ ...row, error: response.error || "gdelt_request_failed_or_rate_limited" }));
  }

  return stocks.map((stock) => {
    const articles = (response.data?.articles || [])
      .filter((article) => articleMatchesStock(stock, article.title))
      .slice(0, 4)
      .map((article) => ({
        title: article.title || "Untitled article",
        url: article.url,
        domain: article.domain,
        seen_date: article.seendate
      }));

    return {
      symbol: stock.symbol,
      ok: true,
      source: GDELT_SOURCE,
      article_count: articles.length,
      top_articles: articles
    };
  });
}

function timeoutFallbacks(stocks: RobinhoodToken[]): StockSignals {
  return {
    ok: false,
    source_note: "Stock signal sources timed out before Hermes could use them.",
    prices: stocks.map((stock) => ({ symbol: stock.symbol, ok: false, source: STOOQ_SOURCE, error: "source_timeout" })),
    filings: stocks.map((stock) => ({ symbol: stock.symbol, ok: false, source: SEC_SOURCE, recent_material_count: 0, recent_forms: [], error: "source_timeout" })),
    news: stocks.map((stock) => ({ symbol: stock.symbol, ok: false, source: GDELT_SOURCE, article_count: 0, top_articles: [], error: "source_timeout" }))
  };
}

export async function fetchStockSignals(stocks = robinhoodStockTokens): Promise<StockSignals> {
  const sourceNote = "Hermes uses Stooq public quotes with Yahoo Chart fallback, SEC EDGAR submissions, and GDELT news with Yahoo Finance RSS/search fallback as supporting stock context before any Robinhood Chain quote preparation.";
  const cacheKey = stocks.map((stock) => `${stock.symbol}:${stock.secCik || ""}`).join("|");
  const ttlMs = cacheTtlMs();
  if (stockSignalsCache && stockSignalsCache.key === cacheKey && Date.now() - stockSignalsCache.ts < ttlMs) {
    return { ...stockSignalsCache.value, cached: true };
  }

  const sourcePromise = Promise.all([
    Promise.all(stocks.map((stock) => fetchPrice(stock))),
    Promise.all(stocks.map((stock) => fetchFiling(stock))),
    fetchNews(stocks)
  ]);
  const timeoutMs = Number(env("STOCK_SIGNALS_TIMEOUT_MS", "20000")) || 20000;
  const timer = new Promise<StockSignals>((resolve) => setTimeout(() => resolve(timeoutFallbacks(stocks)), timeoutMs));
  const result = await Promise.race([
    sourcePromise.then(([prices, filings, news]) => ({
      ok: prices.some((row) => row.ok) || filings.some((row) => row.ok) || news.some((row) => row.ok),
      source_note: sourceNote,
      prices,
      filings,
      news
    })),
    timer
  ]);

  if (result.ok) {
    stockSignalsCache = { ts: Date.now(), key: cacheKey, value: result };
  }

  return result;
}
