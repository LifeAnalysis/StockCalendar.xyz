import { jsonResponse } from "@/lib/env";
import { prepareStockTrade, StockTradeInput } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<StockTradeInput> & {
    sourceAsset?: string;
    targetAsset?: string;
    walletAddress?: string;
  };
  const payload: StockTradeInput = {
    action: body.action || "buy",
    source_asset: body.source_asset || body.sourceAsset || "",
    target_asset: body.target_asset || body.targetAsset || "",
    amount: body.amount || "",
    wallet_address: body.wallet_address || body.walletAddress || "",
    provider: body.provider || "auto",
    slippagePercentage: body.slippagePercentage,
    strategy: body.strategy
  };
  return jsonResponse(await prepareStockTrade(payload));
}
