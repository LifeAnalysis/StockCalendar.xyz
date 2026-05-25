import { fetchText } from "./http";
import { RobinhoodToken } from "./robinhood";

const MARKETBEAT_EXCHANGE = "NASDAQ";
const MARKETBEAT_SOURCE = "https://www.marketbeat.com";

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value} UTC`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const shortDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (shortDate) {
    const [, month, day, year] = shortDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return undefined;
}

function dateFromSortValue(value?: string): string | undefined {
  if (!value || value.length < 8) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function parseMarketBeatCalendar(html: string) {
  const estimatedSortDate = /<td[^>]*data-sort-value="(20\d{6})\d*"[^>]*>\s*[^<]*<br\/>\(Estimated\)/i.exec(html)?.[1];
  const upcomingText =
    /next earnings date is estimated for (?:[A-Za-z]+,\s+)?([A-Za-z]{3,9}\.?\s+\d{1,2},\s+\d{4})/i.exec(html)?.[1] ||
    /Upcoming [^<]*Earnings Date[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i.exec(html)?.[1];
  const earningsDate = dateFromSortValue(estimatedSortDate) || normalizeDate(decodeHtml(upcomingText || ""));
  const eps =
    /Consensus EPS[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i.exec(html)?.[1] ||
    /consensus estimates of <strong>([^<]+)<\/strong>/i.exec(html)?.[1];
  const revenue =
    /Actual Revenue[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i.exec(html)?.[1] ||
    /Quarterly revenue[^.]*to <strong>([^<]+)<\/strong>/i.exec(html)?.[1];

  return {
    earningsDate,
    earningsAverage: decodeHtml(eps || "") || undefined,
    revenueAverage: decodeHtml(revenue || "") || undefined
  };
}

export async function fetchPublicCalendar(stock: RobinhoodToken) {
  const url = `${MARKETBEAT_SOURCE}/stocks/${MARKETBEAT_EXCHANGE}/${encodeURIComponent(stock.symbol)}/earnings/`;
  const response = await fetchText(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 hermes-next-agent/2.0"
    },
    timeoutMs: Number(process.env.CALENDAR_SOURCE_TIMEOUT_MS || "15000") || 15000
  });
  const parsed = response.ok ? parseMarketBeatCalendar(response.text) : null;
  const earningsDate = parsed?.earningsDate ? [parsed.earningsDate] : [];

  return {
    symbol: stock.symbol,
    ok: response.ok && earningsDate.length > 0,
    status: response.status,
    source: `${MARKETBEAT_SOURCE}/stocks/${MARKETBEAT_EXCHANGE}/{symbol}/earnings/`,
    error: response.ok ? (earningsDate.length ? undefined : "marketbeat_earnings_date_not_found") : response.error,
    earnings_dates: earningsDate,
    estimates: {
      earnings_average: parsed?.earningsAverage,
      revenue_average: parsed?.revenueAverage
    },
    public_links: [
      `https://finance.yahoo.com/calendar/earnings?symbol=${stock.symbol}`,
      `https://www.nasdaq.com/market-activity/stocks/${stock.symbol.toLowerCase()}/earnings`
    ]
  };
}

export async function fetchStockCalendars(stocks: RobinhoodToken[]) {
  return Promise.all(stocks.map((stock) => fetchPublicCalendar(stock)));
}
