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
  vote: LlmVote | null;
  status?: number;
  error?: string;
  finish_reason?: string;
  provider_model?: string;
  usage?: unknown;
};

type VoteAction = "BUY" | "WATCH" | "NO_BUY" | "CONFIG_NEEDED";

type LlmStockVote = {
  symbol: string;
  action: VoteAction;
  confidence: number;
  reason: string;
  user_action?: string;
};

type LlmVote = {
  verdict: string;
  summary: string;
  user_action: string;
  reply?: string;
  stocks: LlmStockVote[];
};

export const DEFAULT_HERMES_OUTPUT_PROMPT =
  "For Tesla, Amazon, Palantir, Netflix, and AMD, identify any Robinhood Chain stock-token quote worth preparing now. Use only the executed Hermes tool results as evidence and keep the wallet-signing boundary explicit.";

const HERMES_SYSTEM_PROMPT_VERSION = "robinhood-chain-research-v3";

function buildHermesSystemPrompt() {
  return [
    "You are Hermes Agent for Robinhood Chain stock-token execution research.",
    "The application has already executed the required tools before this chat call. Treat DATA_PIPELINE_JSON as authoritative tool results, not as suggestions.",
    "Do not claim to browse, search, call APIs, fetch filings, scan Kalshi, inspect explorer contracts, prepare quotes, sign transactions, or execute trades during this OpenRouter turn.",
    "Your job is to cast the final Hermes vote from the supplied tool results for a human who may decide whether to prepare a quote.",
    "Use only DATA_PIPELINE_JSON for chain contracts, supporting market context, prices, filings, calendars, explorer confirmation, and source status.",
    "Route readiness and explorer confirmation are prerequisites, not confidence evidence. They can block a trade, but they must not increase confidence by themselves.",
    "Stooq, Yahoo chart data, SEC EDGAR, GDELT, calendars, and Kalshi are supporting evidence for the final vote.",
    "Kalshi website search pages are not a runtime data source. Use only public Trade API records included in DATA_PIPELINE_JSON and the local stock-term filter metadata.",
    "Every stock must receive one final action: BUY, WATCH, NO_BUY, or CONFIG_NEEDED. You may differ from the deterministic evidence score when the supplied evidence justifies it.",
    "BUY means quote preparation may be shown, not that Hermes can execute. WATCH and NO_BUY must not ask the user to sign.",
    "For quote prep, require exact source_asset, target_asset, wallet_address, amount, and chainId 46630.",
    "When YES/NO prices exist, explain what they support and include bid/ask values. When no clean market exists, say the absence clearly.",
    "If a source is degraded, say so directly and do not infer missing data.",
    "The reply field must be the user-facing final output, not a generic summary.",
    "Write reply in four compact sections with each heading on its own line exactly: Checked, Final vote, Why, Next.",
    "Checked must name the app-executed API/function checks that materially affected the vote: Robinhood official contracts, Kalshi public Trade API scan, public quote snapshot, SEC filings, calendar feed status, GDELT/news status, and explorer confirmation when present.",
    "Final vote must list every stock with action and confidence.",
    "Why must give concrete evidence for BUY names, including YES/NO bid/ask if present, latest quote, and latest SEC filing. For WATCH/NO_BUY names, say what evidence is missing or too weak.",
    "Next must keep the wallet boundary explicit: quote preparation only after the user accepts the evidence and signing step.",
    "Keep reply under 900 characters. Keep each stock reason under 220 characters. Do not use markdown tables.",
    "Do not describe internal tool execution, reasoning traces, confidence math, or model internals.",
    "Do not show chain-of-thought.",
    "Return only valid JSON with this shape: {\"verdict\":\"...\",\"summary\":\"...\",\"user_action\":\"...\",\"reply\":\"concise user-facing textual output\",\"stocks\":[{\"symbol\":\"TSLA\",\"action\":\"BUY|WATCH|NO_BUY|CONFIG_NEEDED\",\"confidence\":0,\"reason\":\"...\",\"user_action\":\"...\"}]}."
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

function decisionReply(decision: Awaited<ReturnType<typeof buildStockIntel>>["hermes_decision"], intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  const degraded = intel.pipeline.degraded_sources.length ? ` Degraded sources: ${intel.pipeline.degraded_sources.join(", ")}.` : "";
  const recommendations = decision.stocks
    .map((row) => {
      const reason = row.reason || "No clean evidence available right now.";
      const route = row.routeable ? "route ready" : "route unavailable";
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

function fallbackReply(intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  return decisionReply(intel.hermes_decision, intel);
}

function clipText(value: unknown, max = 400) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, Math.max(0, max - 3))}...` : text;
}

function buildVoteContext(intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  return {
    timestamp: intel.timestamp,
    source_policy: intel.hermes_decision.source_note,
    wallet_boundary: "quote_preparation_only_wallet_signature_required",
    pipeline: {
      ok: intel.pipeline.ok,
      degraded_sources: intel.pipeline.degraded_sources,
      checks: intel.pipeline.checks.map((check) => ({
        name: check.name,
        ok: check.ok,
        required: check.required,
        records: check.records,
        error: clipText(check.error, 160),
        note: clipText(check.note, 220)
      }))
    },
    stocks: intel.recommendations.map((recommendation) => {
      const evidence = recommendation.evidence;
      const market = evidence.top_kalshi_market;
      return {
        symbol: recommendation.symbol,
        deterministic_action: recommendation.action,
        deterministic_confidence: recommendation.confidence,
        routeable: Boolean(evidence.official_contract),
        explorer_confirmed: evidence.explorer_confirmed,
        kalshi_match_count: evidence.kalshi_match_count,
        top_kalshi_market: market
          ? {
              ticker: market.ticker,
              title: clipText(market.title, 180),
              score: market.score,
              yes_bid: market.yes_bid_dollars,
              yes_ask: market.yes_ask_dollars,
              no_bid: market.no_bid_dollars,
              no_ask: market.no_ask_dollars,
              liquidity: market.liquidity_dollars,
              close_time: market.close_time
            }
          : null,
        market_pricing: evidence.market_pricing || null,
        price_snapshot: evidence.price_snapshot
          ? {
              close: evidence.price_snapshot.close,
              date: evidence.price_snapshot.date,
              volume: evidence.price_snapshot.volume,
              source: evidence.price_snapshot.source
            }
          : null,
        latest_filing: evidence.latest_filing
          ? {
              form: evidence.latest_filing.form,
              filing_date: evidence.latest_filing.filing_date,
              document_url: evidence.latest_filing.document_url
            }
          : null,
        news_count: evidence.news_count,
        calendar_ok: evidence.calendar_ok,
        earnings_dates: evidence.earnings_dates?.slice(0, 3) || [],
        rationale: clipText(recommendation.rationale, 650),
        user_action: clipText(recommendation.user_action, 350)
      };
    })
  };
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

function parseJsonObject(text: string | null): unknown {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeVote(value: unknown, intel: Awaited<ReturnType<typeof buildStockIntel>>): LlmVote | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<LlmVote>;
  if (!Array.isArray(data.stocks)) return null;
  const known = new Set(intel.robinhood_chain.stocks.map((stock) => stock.symbol));
  const allowed = new Set<VoteAction>(["BUY", "WATCH", "NO_BUY", "CONFIG_NEEDED"]);
  const stocks = data.stocks
    .map((row): LlmStockVote | null => {
      if (!row || typeof row !== "object") return null;
      const item = row as Partial<LlmStockVote>;
      const symbol = typeof item.symbol === "string" ? item.symbol.toUpperCase() : "";
      const action = typeof item.action === "string" ? (item.action.toUpperCase() as VoteAction) : item.action;
      if (!known.has(symbol) || !action || !allowed.has(action)) return null;
      const confidence = Number(item.confidence);
      const vote: LlmStockVote = {
        symbol,
        action,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(95, Math.round(confidence))) : 0,
        reason: typeof item.reason === "string" && item.reason.trim() ? item.reason.trim().slice(0, 900) : "OpenRouter returned a final vote without a detailed reason."
      };
      if (typeof item.user_action === "string" && item.user_action.trim()) {
        vote.user_action = item.user_action.trim().slice(0, 500);
      }
      return vote;
    })
    .filter((row): row is LlmStockVote => Boolean(row));

  if (!stocks.length) return null;
  return {
    verdict: typeof data.verdict === "string" && data.verdict.trim() ? data.verdict.trim().slice(0, 180) : "Hermes OpenRouter final vote",
    summary: typeof data.summary === "string" && data.summary.trim() ? data.summary.trim().slice(0, 500) : "OpenRouter returned a final vote from the supplied evidence.",
    user_action: typeof data.user_action === "string" && data.user_action.trim() ? data.user_action.trim().slice(0, 500) : "Review the OpenRouter final vote before preparing any wallet-bound quote.",
    reply: typeof data.reply === "string" && data.reply.trim() ? data.reply.trim().slice(0, 3000) : undefined,
    stocks
  };
}

function labelForAction(action: VoteAction) {
  if (action === "BUY") return "Buy setup";
  if (action === "WATCH") return "Watch";
  if (action === "CONFIG_NEEDED") return "Config needed";
  return "No buy";
}

function buildOpenRouterDecision(vote: LlmVote, intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  const voteBySymbol = new Map(vote.stocks.map((stock) => [stock.symbol, stock]));
  const actionCounts = { BUY: 0, WATCH: 0, NO_BUY: 0, CONFIG_NEEDED: 0 };
  const stocks = intel.hermes_decision.stocks.map((stock) => {
    const llm = voteBySymbol.get(stock.symbol);
    const action = llm?.action || stock.action;
    actionCounts[action] += 1;
    return {
      ...stock,
      action,
      label: labelForAction(action),
      confidence: llm?.confidence ?? stock.confidence,
      reason: llm?.reason || stock.reason,
      user_action: llm?.user_action || stock.user_action
    };
  });
  return {
    ...intel.hermes_decision,
    verdict: vote.verdict,
    summary: vote.summary,
    action_counts: actionCounts,
    user_action: vote.user_action,
    stocks
  };
}

function buildStockReplies(decision: Awaited<ReturnType<typeof buildStockIntel>>["hermes_decision"], intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  const recommendationBySymbol = new Map(intel.recommendations.map((recommendation) => [recommendation.symbol, recommendation]));
  const degraded = new Set(intel.pipeline.degraded_sources);
  return Object.fromEntries(
    decision.stocks.map((stock) => {
      const recommendation = recommendationBySymbol.get(stock.symbol);
      const evidence = recommendation?.evidence;
      const market = evidence?.top_kalshi_market;
      const pricing = evidence?.market_pricing;
      const quote = evidence?.price_snapshot;
      const filing = evidence?.latest_filing;
      const gaps = [
        !market ? "no clean Kalshi market" : "",
        !evidence?.calendar_ok ? "calendar unavailable or empty" : "",
        !evidence?.news_count ? degraded.has("gdelt_news") ? "news feed degraded" : "no recent GDELT articles" : "",
        !filing ? "no recent SEC filing signal" : ""
      ].filter(Boolean);
      const marketLine = market
        ? `Kalshi: ${market.ticker}${market.title ? ` - ${market.title}` : ""}. ${pricing?.spread_note || "Market matched without complete YES/NO pricing."}`
        : "Kalshi: no clean prediction-market match, so this cannot add conviction.";
      const quoteLine = quote?.close
        ? `Quote: ${formatMoney(quote.close)} close${quote.date ? ` on ${quote.date}` : ""}${quote.volume ? `, ${formatVolume(quote.volume)} volume` : ""}.`
        : "Quote: no clean latest public quote.";
      const filingLine = filing
        ? `SEC: ${filing.form}${filing.filing_date ? ` filed ${filing.filing_date}` : ""}.`
        : "SEC: no recent material filing signal.";
      const calendarLine = evidence?.calendar_ok
        ? `Calendar: ${evidence.earnings_dates.length ? evidence.earnings_dates.slice(0, 2).join(", ") : "feed returned without a dated catalyst"}.`
        : "Calendar: unavailable or no usable catalyst.";
      const newsLine = evidence?.news_count
        ? `News: ${evidence.news_count} recent GDELT item(s).`
        : degraded.has("gdelt_news")
          ? "News: feed degraded, not used for the vote."
          : "News: no recent GDELT signal.";
      const call =
        stock.action === "BUY"
          ? "Quote prep may be shown, but this is not an execution instruction."
          : stock.action === "WATCH"
            ? "Keep visible on watch; do not ask for a signature."
            : stock.action === "CONFIG_NEEDED"
              ? "Fix degraded or missing sources before presenting a trade call."
            : "Do not present quote prep for this setup.";
      const take =
        stock.reason ||
        (stock.action === "BUY"
          ? `${stock.symbol} has enough supporting evidence for quote prep: route is ready, the market signal is present, and public quote/filing data are available. Calendar/news gaps stay visible, so this is a quote-prep vote, not a trade execution call.`
          : `${stock.symbol} stays on watch because the route is ready but supporting evidence is incomplete. Keep it visible, but do not ask for a signature until market, calendar, news, or filing evidence improves.`);

      return [
        stock.symbol,
        [
          `${stock.symbol} - ${stock.action} (${stock.confidence}/100)`,
          `Take: ${take}`,
          `Call: ${call}`,
          `Route: ${stock.routeable ? "official Robinhood Chain contract exists" : "no official route"}; explorer ${evidence?.explorer_confirmed ? "confirmed" : "not confirmed"}. Route/explorer are readiness checks only.`,
          `Market: ${marketLine}`,
          quoteLine,
          filingLine,
          calendarLine,
          newsLine,
          `Gaps: ${gaps.length ? gaps.join("; ") : "no major configured-source gap beyond normal market risk"}.`,
          `Next: ${stock.user_action}`
        ].filter(Boolean).join("\n")
      ];
    })
  );
}

async function askHermes(message: string, intel: Awaited<ReturnType<typeof buildStockIntel>>): Promise<OpenRouterChatResult> {
  const apiKey = env("OPENROUTER_API_KEY");
  const model = env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash");
  if (!apiKey) {
    return { configured: false, ok: false, model, reply: null, vote: null, error: "OPENROUTER_API_KEY is not configured" };
  }

  const maxTokens = Number(env("OPENROUTER_MAX_TOKENS", "1800"));
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
      max_tokens: Number.isFinite(maxTokens) ? Math.min(Math.max(Math.trunc(maxTokens), 256), 4096) : 1800,
      response_format: { type: "json_object" },
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
              model_role: "final_vote_from_supplied_tool_results_only",
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
            output_contract: {
              reply_sections: ["Checked", "Final vote", "Why", "Next"],
              source_policy: "Say that the app checked sources; do not imply the model browsed or called APIs directly.",
              confidence_policy: "Route readiness and explorer confirmation are prerequisites, not confidence evidence.",
              wallet_policy: "Quote preparation only; signing stays with the wallet owner."
            },
            vote_context: buildVoteContext(intel)
          })}`
        },
        { role: "user", content: message }
      ]
    }
  });

  const choice = response.data?.choices?.[0];
  const reply = choice?.message?.content?.trim() || null;
  const vote = normalizeVote(parseJsonObject(reply), intel);
  if (response.ok && vote) {
    return {
      configured: true,
      ok: true,
      model,
      reply,
      vote,
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
    vote: null,
    status: response.status,
    error: safeOpenRouterError(response.data) || response.error || (response.ok ? "openrouter_invalid_or_empty_vote" : "openrouter_request_failed"),
    finish_reason: choice?.finish_reason,
    provider_model: response.data?.model,
    usage: response.data?.usage
  };
}

export async function buildHermesOutput(message = DEFAULT_HERMES_OUTPUT_PROMPT, options: { debug?: boolean } = {}) {
  try {
    const intel = await buildStockIntel();
    const chat = await askHermes(message, intel);
    const finalDecision = chat.vote ? buildOpenRouterDecision(chat.vote, intel) : intel.hermes_decision;
    const replySource = chat.vote ? "openrouter" : "fallback";
    const reply = chat.vote ? chat.vote.reply || decisionReply(finalDecision, intel) : fallbackReply(intel);
    return {
      reply,
      reply_source: replySource,
      vote_source: replySource,
      llm_vote: chat.vote,
      stock_replies: buildStockReplies(finalDecision, intel),
      ui_brief_source: "data.recommendations",
      system_prompt_version: HERMES_SYSTEM_PROMPT_VERSION,
      hermes_decision: finalDecision,
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
          role: "final_vote_from_supplied_tool_results",
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
          role: "final_vote_from_supplied_tool_results",
          model: env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash"),
          error: messageText
        }
      ]
    };
  }
}
