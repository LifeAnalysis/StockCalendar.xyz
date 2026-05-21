import { fetchJson } from "./http";
import { RobinhoodToken } from "./robinhood";

type YahooCalendarResponse = {
  quoteSummary?: {
    result?: Array<{
      calendarEvents?: {
        earnings?: {
          earningsDate?: Array<{ raw?: number; fmt?: string }>;
          earningsAverage?: { raw?: number; fmt?: string };
          revenueAverage?: { raw?: number; fmt?: string };
        };
      };
    }>;
    error?: unknown;
  };
};

export async function fetchPublicCalendar(stock: RobinhoodToken) {
  const yahoo = await fetchJson<YahooCalendarResponse>(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(stock.symbol)}?modules=calendarEvents`,
    { timeoutMs: 12000 }
  );
  const earnings = yahoo.data?.quoteSummary?.result?.[0]?.calendarEvents?.earnings;
  const earningsDate = earnings?.earningsDate?.map((item) => item.fmt || (item.raw ? new Date(item.raw * 1000).toISOString().slice(0, 10) : null)).filter(Boolean) || [];

  return {
    symbol: stock.symbol,
    ok: yahoo.ok && Boolean(earnings),
    source: yahoo.ok ? "Yahoo Finance calendarEvents" : "Yahoo Finance calendarEvents unavailable",
    earnings_dates: earningsDate,
    estimates: {
      earnings_average: earnings?.earningsAverage?.fmt,
      revenue_average: earnings?.revenueAverage?.fmt
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
