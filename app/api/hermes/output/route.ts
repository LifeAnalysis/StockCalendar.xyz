import { buildHermesComparisonOutput, buildHermesOutput } from "@/lib/hermes-output";
import { jsonResponse } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get("debug") === "1";
  const bypassCache = searchParams.get("cache") === "0";
  const symbol = searchParams.get("symbol");
  const compare = searchParams.get("compare") === "1";
  return jsonResponse(
    compare
      ? await buildHermesComparisonOutput({ debug, bypassCache })
      : await buildHermesOutput(undefined, { debug, bypassCache, symbol: symbol || undefined })
  );
}
