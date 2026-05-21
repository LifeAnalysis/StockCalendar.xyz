import { jsonResponse } from "@/lib/env";
import { robinhoodStatus } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse(await robinhoodStatus());
}
