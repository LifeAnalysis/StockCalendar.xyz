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
const SEC_SOURCE = "https://data.sec.gov/submissions/";
const GDELT_SOURCE = "https://api.gdeltproject.org/api/v2/doc/doc";

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
  if (!response.ok) {
    return { symbol: stock.symbol, ok: false, source: STOOQ_SOURCE, error: response.error || "stooq_request_failed" };
  }
  const row = parseCsv(response.text);
  if (!row || row.Close === "N/D") {
    return { symbol: stock.symbol, ok: false, source: STOOQ_SOURCE, error: "stooq_quote_unavailable" };
  }
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
    timeoutMs: Number(env("GDELT_TIMEOUT_MS", "3000")) || 3000
  });
  if (!response.ok || !response.data?.articles) {
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
  const sourceNote = "Hermes uses Stooq public quotes, SEC EDGAR submissions, and GDELT news as supporting stock context before any Robinhood Chain quote preparation.";
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
  const timeoutMs = Number(env("STOCK_SIGNALS_TIMEOUT_MS", "12000")) || 12000;
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
