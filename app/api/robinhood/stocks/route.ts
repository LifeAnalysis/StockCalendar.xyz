import { jsonResponse } from "@/lib/env";
import { robinhoodPaymentTokens, robinhoodStockTokens } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse({
    ok: true,
    source: "https://docs.robinhood.com/chain/contracts/",
    chainId: 46630,
    stocks: robinhoodStockTokens,
    payment_tokens: robinhoodPaymentTokens
  });
}
