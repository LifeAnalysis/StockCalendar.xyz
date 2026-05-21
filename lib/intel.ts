import { fetchStockCalendars } from "./calendar";
import { matchStockMarkets } from "./kalshi";
import { robinhoodPaymentTokens, robinhoodStockTokens } from "./robinhood";

export async function buildStockIntel() {
  const [kalshi, calendars] = await Promise.all([
    matchStockMarkets(robinhoodStockTokens),
    fetchStockCalendars(robinhoodStockTokens)
  ]);

  return {
    ok: kalshi.ok,
    timestamp: new Date().toISOString(),
    robinhood_chain: {
      stock_count: robinhoodStockTokens.length,
      payment_tokens: robinhoodPaymentTokens,
      stocks: robinhoodStockTokens,
      source: "https://docs.robinhood.com/chain/contracts/"
    },
    kalshi,
    calendars
  };
}
