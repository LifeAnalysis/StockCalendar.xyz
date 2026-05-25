import { env } from "./env";
import { fetchJson } from "./http";
import { buildStockIntel, compactStockIntel } from "./intel";

type OpenRouterResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
    };
  }>;
  model?: string;
  usage?: unknown;
  error?: unknown;
};

type OpenRouterChatResult = {
  configured: boolean;
  ok: boolean;
  model: string;
  reply: string | null;
  status?: number;
  error?: string;
  finish_reason?: string;
  provider_model?: string;
  usage?: unknown;
};

export const DEFAULT_HERMES_OUTPUT_PROMPT =
  "For Tesla, Amazon, Palantir, Netflix, and AMD, identify any Robinhood Chain stock-token quote worth preparing now. Use only the executed Hermes tool results as evidence and keep the wallet-signing boundary explicit.";

const HERMES_SYSTEM_PROMPT_VERSION = "robinhood-chain-research-v3";

function buildHermesSystemPrompt() {
  return [
    "You are Hermes Agent for Robinhood Chain stock-token execution research.",
    "The application has already executed the required tools before this chat call. Treat DATA_PIPELINE_JSON as authoritative tool results, not as suggestions.",
    "Do not claim to browse, search, call APIs, fetch filings, scan Kalshi, inspect explorer contracts, prepare quotes, sign transactions, or execute trades during this OpenRouter turn.",
    "Your job is to summarize the supplied Hermes tool results for a human who may decide whether to prepare a quote.",
    "Use only DATA_PIPELINE_JSON for chain contracts, supporting market context, prices, filings, calendars, explorer confirmation, and source status.",
    "Robinhood Chain stock-token route readiness is the object of the recommendation. Stooq, Yahoo chart data, SEC EDGAR, GDELT, calendars, explorer search, and Kalshi are supporting evidence only.",
    "Kalshi website search pages are not a runtime data source. Use only public Trade API records included in DATA_PIPELINE_JSON and the local stock-term filter metadata.",
    "Every stock has a hermes_decision action: BUY, WATCH, NO_BUY, or CONFIG_NEEDED. Preserve those actions exactly; do not upgrade or downgrade them.",
    "BUY means quote preparation may be shown, not that Hermes can execute. WATCH and NO_BUY must not ask the user to sign.",
    "For quote prep, require exact source_asset, target_asset, wallet_address, amount, and chainId 46630.",
    "When YES/NO prices exist, explain what they support and include bid/ask values. When no clean market exists, say the absence clearly.",
    "If a source is degraded, say so directly and do not infer missing data.",
    "Keep the answer concise: verdict, per-stock action, useful evidence, degraded source caveats, and the next wallet-boundary step.",
    "Do not describe internal tool execution, tool names, reasoning traces, confidence math, or model internals.",
    "Do not show chain-of-thought. Return only a concise user-facing verdict."
  ].join(" ");
}

function formatMoney(value?: number) {
  if (!Number.isFinite(value)) return "n/a";
  return `$${Number(value).toFixed(Number(value) >= 100 ? 2 : 4)}`;
}

function formatVolume(value?: number) {
  if (!Number.isFinite(value)) return "n/a";
  if (Number(value) >= 1_000_000) return `${(Number(value) / 1_000_000).toFixed(1)}M`;
  if (Number(value) >= 1_000) return `${(Number(value) / 1_000).toFixed(1)}K`;
  return String(value);
}

function fallbackReply(intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  const decision = intel.hermes_decision;
  const degraded = intel.pipeline.degraded_sources.length ? ` Degraded sources: ${intel.pipeline.degraded_sources.join(", ")}.` : "";
  const recommendations = decision.stocks
    .map((row) => {
      const reason = row.reason || "No clean evidence available right now.";
      const route = row.latest_filing ? "route support exists" : "route status unknown";
      const next = row.user_action;
      return `${row.symbol}: ${row.action} (${row.confidence}%). ${route}. ${reason} Next step: ${next}`;
    })
    .join("\n");
  const searched = intel.kalshi.searched_terms?.length ? ` Filtered terms: ${intel.kalshi.searched_terms.join(", ")}.` : "";
  return [
    `Verdict: ${decision.verdict}.`,
    `Summary: ${decision.summary}`,
    `Context: ${intel.robinhood_chain.stock_count} Robinhood Chain stock tokens, ${intel.robinhood_chain.payment_tokens.length} payment tokens, ${intel.kalshi.scanned_markets} public Kalshi markets fetched, ${intel.stock_signals.prices.filter((row) => row.ok).length} public quote snapshots, ${intel.stock_signals.filings.filter((row) => row.ok).length} SEC filing streams, and ${intel.calendars.length} public calendar feeds.${searched} Source policy: ${intel.hermes_decision.source_note}${degraded}`,
    "Per stock:",
    recommendations,
    `Next: ${decision.user_action}`
  ].join("\n");
}

function safeOpenRouterError(response: OpenRouterResponse | undefined): string | undefined {
  if (!response?.error) return undefined;
  if (typeof response.error === "string") return response.error.slice(0, 240);
  if (typeof response.error === "object" && response.error && "message" in response.error) {
    const message = (response.error as { message?: unknown }).message;
    return typeof message === "string" ? message.slice(0, 240) : undefined;
  }
  return "openrouter_error";
}

async function askHermes(message: string, intel: Awaited<ReturnType<typeof buildStockIntel>>): Promise<OpenRouterChatResult> {
  const apiKey = env("OPENROUTER_API_KEY");
  const model = env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash");
  if (!apiKey) {
    return { configured: false, ok: false, model, reply: null, error: "OPENROUTER_API_KEY is not configured" };
  }

  const maxTokens = Number(env("OPENROUTER_MAX_TOKENS", "1200"));
  const timeoutMs = Number(env("OPENROUTER_TIMEOUT_MS", "45000"));
  const response = await fetchJson<OpenRouterResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(10000, Math.trunc(timeoutMs)) : 45000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://hermes-agent-backend.vercel.app",
      "X-OpenRouter-Title": "Hermes Robinhood Chain",
      "X-Title": "Hermes Robinhood Chain"
    },
    body: {
      model,
      temperature: 0.2,
      max_tokens: Number.isFinite(maxTokens) ? Math.min(Math.max(Math.trunc(maxTokens), 256), 4096) : 1200,
      messages: [
        {
          role: "system",
          content: buildHermesSystemPrompt()
        },
        {
          role: "system",
          content: `DATA_PIPELINE_JSON=${JSON.stringify({
            system_prompt_version: HERMES_SYSTEM_PROMPT_VERSION,
            timestamp: intel.timestamp,
            pipeline: intel.pipeline,
            tool_execution_contract: {
              model_role: "format_supplied_tool_results_only",
              app_executed_tools: [
                "robinhood_chain_tokens",
                "kalshi_public_markets",
                "public_event_calendars",
                "stooq_public_quotes",
                "sec_edgar_filings",
                "gdelt_news",
                "explorer_stock_like_tokens"
              ],
              wallet_boundary: "quote_preparation_only_wallet_signature_required"
            },
            agent_context: intel.agent_context,
            hermes_decision: intel.hermes_decision
          })}`
        },
        { role: "user", content: message }
      ]
    }
  });

  const choice = response.data?.choices?.[0];
  const reply = choice?.message?.content?.trim() || null;
  if (response.ok && reply) {
    return {
      configured: true,
      ok: true,
      model,
      reply,
      status: response.status,
      finish_reason: choice?.finish_reason,
      provider_model: response.data?.model,
      usage: response.data?.usage
    };
  }
  return {
    configured: true,
    ok: false,
    model,
    reply: null,
    status: response.status,
    error: safeOpenRouterError(response.data) || response.error || (response.ok ? "openrouter_empty_response" : "openrouter_request_failed"),
    finish_reason: choice?.finish_reason,
    provider_model: response.data?.model,
    usage: response.data?.usage
  };
}

export async function buildHermesOutput(message = DEFAULT_HERMES_OUTPUT_PROMPT, options: { debug?: boolean } = {}) {
  try {
    const intel = await buildStockIntel();
    const chat = await askHermes(message, intel);
    const replySource = chat.reply ? "openrouter" : "fallback";
    const reply = chat.reply || fallbackReply(intel);
    return {
      reply,
      reply_source: replySource,
      ui_brief_source: "data.recommendations",
      system_prompt_version: HERMES_SYSTEM_PROMPT_VERSION,
      hermes_decision: intel.hermes_decision,
      data: options.debug ? intel : compactStockIntel(intel),
      tool_trace: [
        {
          name: "buildStockIntel",
          ok: intel.ok,
          role: "app_executed_tools",
          degraded_sources: intel.pipeline.degraded_sources
        },
        {
          name: "openrouter_chat",
          ok: chat.ok,
          configured: chat.configured,
          role: "summarize_tool_results",
          model: chat.model,
          provider_model: chat.provider_model,
          status: chat.status,
          finish_reason: chat.finish_reason,
          error: chat.error,
          usage: chat.usage
        }
      ]
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    return {
      reply: `Hermes output not available right now. Retry after verifying runtime dependencies (OpenRouter, network endpoints, and required env vars). Detail: ${messageText || "unknown error"}`,
      reply_source: "fallback",
      ui_brief_source: "data.recommendations",
      system_prompt_version: HERMES_SYSTEM_PROMPT_VERSION,
      hermes_decision: {
        verdict: "No hermes verdict generated",
        summary: "OpenRouter output composition failed before recommendations were finalized.",
        source_note: "Fallback text is used when output building fails.",
        action_counts: {
          BUY: 0,
          WATCH: 0,
          NO_BUY: 0,
          CONFIG_NEEDED: 0
        },
        user_action: "Retry the command after checking service health."
      },
      data: {
        ok: false,
        timestamp: new Date().toISOString(),
        error: messageText
      },
      tool_trace: [
        {
          name: "buildStockIntel",
          ok: false,
          role: "app_executed_tools",
          degraded_sources: [],
          error: messageText
        },
        {
          name: "openrouter_chat",
          ok: false,
          configured: false,
          role: "summarize_tool_results",
          model: env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash"),
          error: messageText
        }
      ]
    };
  }
}
