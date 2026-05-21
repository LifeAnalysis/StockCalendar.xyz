import { env, jsonResponse } from "@/lib/env";
import { fetchJson } from "@/lib/http";
import { buildStockIntel } from "@/lib/intel";
import { prepareStockTrade } from "@/lib/robinhood";

export const dynamic = "force-dynamic";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: unknown;
};

const STOCK_KEYWORDS = [
  "robinhood",
  "stock",
  "stocks",
  "kalshi",
  "market",
  "markets",
  "quote",
  "trade",
  "buy",
  "sell",
  "earnings",
  "calendar",
  "tsla",
  "amzn",
  "pltr",
  "nflx",
  "amd"
];

function wantsStockIntel(message: string): boolean {
  return STOCK_KEYWORDS.some((keyword) => message.includes(keyword));
}

function fallbackReply(message: string, intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  if (message.includes("trade") || message.includes("quote") || message.includes("buy") || message.includes("sell")) {
    return "Hermes has the Robinhood Chain token universe and can prepare a Nuvolari quote through /api/robinhood/trade. A quote still needs exact source and target token contracts, wallet EOA, and integer base-unit amount; Hermes cannot sign.";
  }

  const degraded = intel.pipeline.degraded_sources.length ? ` Degraded sources: ${intel.pipeline.degraded_sources.join(", ")}.` : "";
  const recommendations = intel.recommendations.map((row) => `${row.symbol}: ${row.label} (${row.confidence}%)`).join("; ");
  return `Hermes is fed with ${intel.robinhood_chain.stock_count} Robinhood stock tokens, ${intel.robinhood_chain.payment_tokens.length} payment tokens, ${intel.kalshi.scanned_markets} scanned Kalshi markets, and ${intel.calendars.length} public calendar feeds. Recommendations: ${recommendations}.${degraded}`;
}

async function askHermes(message: string, intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  const apiKey = env("OPENROUTER_API_KEY");
  if (!apiKey) return null;

  const model = env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash");
  const maxTokens = Number(env("OPENROUTER_MAX_TOKENS", "1200"));
  const response = await fetchJson<OpenRouterResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    timeoutMs: 30000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://hermes-agent-backend.vercel.app",
      "X-Title": "Hermes Robinhood Chain"
    },
    body: {
      model,
      max_tokens: Number.isFinite(maxTokens) ? Math.min(Math.max(Math.trunc(maxTokens), 256), 4096) : 1200,
      messages: [
        {
          role: "system",
          content: [
            "You are Hermes Agent for Robinhood Chain stock-token execution research.",
            "Use only DATA_PIPELINE_JSON for chain contracts, market context, and calendars.",
            "Never imply that you can sign or execute a wallet transaction. You only prepare quote payloads.",
            "For quotes, require exact source_asset, target_asset, wallet_address, amount, and chainId 46630.",
            "Every stock has a recommendation in DATA_PIPELINE_JSON; use those labels and evidence instead of inventing investment advice.",
            "If a source is degraded, say so directly instead of inventing missing data."
          ].join(" ")
        },
        {
          role: "system",
          content: `DATA_PIPELINE_JSON=${JSON.stringify({
            timestamp: intel.timestamp,
            pipeline: intel.pipeline,
            agent_context: intel.agent_context
          })}`
        },
        { role: "user", content: message }
      ]
    }
  });

  return response.ok ? response.data?.choices?.[0]?.message?.content?.trim() || null : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message || "").toLowerCase();

  if (wantsStockIntel(message)) {
    const intel = await buildStockIntel();
    const reply = (await askHermes(message, intel)) || fallbackReply(message, intel);
    return jsonResponse({
      reply,
      data: intel,
      tool_trace: [
        { name: "buildStockIntel", ok: intel.ok, degraded_sources: intel.pipeline.degraded_sources },
        { name: "openrouter_chat", ok: Boolean(env("OPENROUTER_API_KEY")) }
      ]
    });
  }

  return jsonResponse({
    reply: "Next.js Hermes is live. Ask for Robinhood stocks, Kalshi stock markets, event calendars, or an atomic stock trade quote.",
    example: await prepareStockTrade({
      action: "buy",
      source_asset: "",
      target_asset: "",
      amount: "",
      wallet_address: "",
      provider: "auto"
    })
  });
}
