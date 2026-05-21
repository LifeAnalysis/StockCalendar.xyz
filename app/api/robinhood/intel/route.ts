import { jsonResponse } from "@/lib/env";
import { buildStockIntel } from "@/lib/intel";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse(await buildStockIntel());
}
