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
  const decision = intel.hermes_decision;
  const degraded = intel.pipeline.degraded_sources.length ? ` Degraded sources: ${intel.pipeline.degraded_sources.join(", ")}.` : "";
  const recommendations = decision.stocks
    .map((row) => `- ${row.symbol}: ${row.action}. ${row.reason} ${row.yes_no_prices ? row.yes_no_prices.spread_note : "No clean YES/NO stock-market price."}`)
    .join("\n");
  const searched = intel.kalshi.searched_terms?.length ? ` Filtered Kalshi terms: ${intel.kalshi.searched_terms.join(", ")}.` : "";
  return [
    `Verdict: ${decision.verdict}.`,
    decision.summary,
    `Context: ${intel.robinhood_chain.stock_count} Robinhood Chain stock tokens, ${intel.robinhood_chain.payment_tokens.length} payment tokens, ${intel.kalshi.scanned_markets} public Kalshi markets fetched, and ${intel.calendars.length} public calendar feeds.${searched} Source policy: ${intel.hermes_decision.source_note}${degraded}`,
    "Per stock:",
    recommendations,
    `Action: ${decision.user_action}`
  ].join("\n");
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
            "Use only DATA_PIPELINE_JSON for chain contracts, supporting market context, and calendars.",
            "Your recommendation is about whether to buy, watch, or not buy the Robinhood Chain stock-token. Kalshi is only supporting evidence, never the object of the recommendation.",
            "Kalshi website search pages are not treated as machine-readable source data. Use only the public Trade API records in DATA_PIPELINE_JSON and the local stock-term filter metadata.",
            "Never imply that you can sign or execute a wallet transaction. You only prepare quote payloads.",
            "For quotes, require exact source_asset, target_asset, wallet_address, amount, and chainId 46630.",
            "Every stock has a hermes_decision action: BUY, WATCH, NO_BUY, or CONFIG_NEEDED. Use those actions and evidence instead of inventing investment advice.",
            "When supporting Kalshi yes/no prices exist, explain what they support for the Robinhood Chain buy decision. When no clean Kalshi market exists, recommend NO_BUY or WATCH instead of forcing a buy.",
            "If a source is degraded, say so directly instead of inventing missing data."
          ].join(" ")
        },
        {
          role: "system",
          content: `DATA_PIPELINE_JSON=${JSON.stringify({
            timestamp: intel.timestamp,
            pipeline: intel.pipeline,
            agent_context: intel.agent_context,
            hermes_decision: intel.hermes_decision
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
      hermes_decision: intel.hermes_decision,
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
