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
  prompt_payload_bytes?: number;
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

const HERMES_SYSTEM_PROMPT_VERSION = "robinhood-chain-research-v5";
type StockIntel = Awaited<ReturnType<typeof buildStockIntel>>;
type HermesOutputOptions = { debug?: boolean; bypassCache?: boolean; symbol?: string };

function normalizeSymbol(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function tickerResearchPrompt(symbol: string) {
  return `Research ${symbol} only. Produce a deep Robinhood Chain stock-token quote-prep vote for this ticker alone. Do not compare it against other tickers. Use only DATA_PIPELINE_JSON and keep the wallet-signing boundary explicit.`;
}

function comparisonPrompt() {
  return "Compare the completed per-ticker Hermes research outputs. Do not revisit raw source evidence or let one ticker change another ticker's standalone research. Rank quote-prep readiness across all completed ticker memos and keep the wallet-signing boundary explicit.";
}

function buildHermesSystemPrompt() {
  return [
    "You are Hermes Agent for Robinhood Chain stock-token execution research.",
    "The application has already executed the required tools before this chat call. Treat DATA_PIPELINE_JSON as authoritative tool results, not as suggestions.",
    "Do not claim to browse, search, call APIs, fetch filings, scan Kalshi, inspect explorer contracts, prepare quotes, sign transactions, or execute trades during this OpenRouter turn.",
    "Your job is to cast the final Hermes vote from the supplied tool results for a human who may decide whether to prepare a quote.",
    "Use only DATA_PIPELINE_JSON for chain contracts, supporting market context, prices, filings, calendars, explorer confirmation, source status, and supplied evidence.",
    "Route readiness and explorer confirmation are prerequisites, not confidence evidence. They can block a trade, but they must not increase confidence by themselves.",
    "Stooq, Yahoo chart data, SEC EDGAR, GDELT/Yahoo news, MarketBeat calendars, and Kalshi are supporting evidence for the final vote.",
    "Kalshi website search pages are not a runtime data source. Use only public Trade API records included in DATA_PIPELINE_JSON and the local stock-term filter metadata.",
    "Every stock must receive one final action: BUY, WATCH, NO_BUY, or CONFIG_NEEDED. You may differ from the deterministic evidence score when the supplied evidence justifies it.",
    "BUY means quote preparation may be shown, not that Hermes can execute. WATCH and NO_BUY must not ask the user to sign.",
    "BUY requires a clean matched Kalshi market with YES/NO pricing. Do not downgrade solely for low displayed market liquidity because this is Robinhood Chain testnet quote-prep research, not production execution.",
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

function decisionReply(decision: StockIntel["hermes_decision"], intel: StockIntel) {
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

function fallbackReply(intel: StockIntel) {
  return decisionReply(intel.hermes_decision, intel);
}

function clipText(value: unknown, max = 400) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, Math.max(0, max - 3))}...` : text;
}

function buildVoteContext(intel: StockIntel) {
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
        top_news: evidence.top_news?.slice(0, 4).map((article) => ({
          title: clipText(article.title, 180),
          url: article.url,
          domain: article.domain
        })) || [],
        calendar_ok: evidence.calendar_ok,
        earnings_dates: evidence.earnings_dates?.slice(0, 3) || [],
        rationale: clipText(recommendation.rationale, 650),
        user_action: clipText(recommendation.user_action, 350)
      };
    })
  };
}

function buildOpenRouterDataPipeline(intel: StockIntel) {
  return {
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
    source_results: {
      robinhood_chain: {
        stock_count: intel.robinhood_chain.stock_count,
        payment_tokens: intel.robinhood_chain.payment_tokens,
        stocks: intel.robinhood_chain.stocks,
        source: intel.robinhood_chain.source
      },
      kalshi: {
        ok: intel.kalshi.ok,
        source: intel.kalshi.source,
        error: intel.kalshi.error,
        scanned_markets: intel.kalshi.scanned_markets,
        search_method: intel.kalshi.search_method,
        source_note: intel.kalshi.source_note,
        searched_terms: intel.kalshi.searched_terms,
        stocks: intel.kalshi.stocks.map((row) => ({
          symbol: row.stock.symbol,
          match_count: row.match_count,
          markets: row.markets
        }))
      },
      calendars: intel.calendars,
      stock_signals: {
        ok: intel.stock_signals.ok,
        source_note: intel.stock_signals.source_note,
        cached: intel.stock_signals.cached,
        prices: intel.stock_signals.prices,
        filings: intel.stock_signals.filings,
        news: intel.stock_signals.news
      },
      explorer_discovery: {
        ok: intel.explorer_discovery.ok,
        source: intel.explorer_discovery.source,
        searched_terms: intel.explorer_discovery.searched_terms,
        stock_like_count: intel.explorer_discovery.stock_like_count,
        official_count: intel.explorer_discovery.official_count,
        other_count: intel.explorer_discovery.other_count,
        official_tokens: intel.explorer_discovery.tokens.filter((token) => token.routed_by_agent || token.trust_level === "official"),
        error: intel.explorer_discovery.error
      }
    },
    deterministic_recommendations: intel.recommendations.map((recommendation) => ({
      symbol: recommendation.symbol,
      recommendation: recommendation.recommendation,
      action: recommendation.action,
      label: recommendation.label,
      confidence: recommendation.confidence,
      score_breakdown: recommendation.score_breakdown,
      rationale: recommendation.rationale,
      user_action: recommendation.user_action,
      quote_requirements: recommendation.quote_requirements
    })),
    deterministic_decision: intel.hermes_decision
  };
}

function actionCountsFor(stocks: StockIntel["hermes_decision"]["stocks"]) {
  return stocks.reduce<Record<VoteAction, number>>(
    (counts, stock) => {
      counts[stock.action] += 1;
      return counts;
    },
    { BUY: 0, WATCH: 0, NO_BUY: 0, CONFIG_NEEDED: 0 }
  );
}

function focusStockIntel(intel: StockIntel, symbol: string): StockIntel {
  const normalized = normalizeSymbol(symbol);
  const stock = intel.robinhood_chain.stocks.find((item) => item.symbol === normalized);
  if (!stock) {
    throw new Error(`Unsupported Robinhood Chain stock symbol: ${normalized || "missing"}`);
  }

  const recommendations = intel.recommendations.filter((item) => item.symbol === normalized);
  const decisionStocks = intel.hermes_decision.stocks.filter((item) => item.symbol === normalized);
  const kalshiStocks = intel.kalshi.stocks.filter((row) => row.stock.symbol === normalized);
  const calendars = intel.calendars.filter((row) => row.symbol === normalized);
  const prices = intel.stock_signals.prices.filter((row) => row.symbol === normalized);
  const filings = intel.stock_signals.filings.filter((row) => row.symbol === normalized);
  const news = intel.stock_signals.news.filter((row) => row.symbol === normalized);
  const aliases = [stock.symbol, stock.name, ...(stock.aliases || [])].map((value) => value.toLowerCase());
  const searchedTerms = (intel.kalshi.searched_terms || []).filter((term) => aliases.includes(term.toLowerCase()));
  const officialTokens = intel.explorer_discovery.tokens.filter(
    (token) => token.address?.toLowerCase() === stock.address.toLowerCase() || token.symbol === stock.symbol
  );
  const focusedDecision = {
    ...intel.hermes_decision,
    verdict: `${stock.symbol} focused Hermes research`,
    summary: decisionStocks[0]
      ? `${stock.symbol} standalone vote: ${decisionStocks[0].action} at ${decisionStocks[0].confidence}/100.`
      : `${stock.symbol} standalone vote unavailable.`,
    searched_terms: searchedTerms,
    action_counts: actionCountsFor(decisionStocks),
    user_action: decisionStocks[0]?.user_action || intel.hermes_decision.user_action,
    stocks: decisionStocks
  };

  return {
    ...intel,
    robinhood_chain: {
      ...intel.robinhood_chain,
      stock_count: 1,
      stocks: [stock]
    },
    explorer_discovery: {
      ...intel.explorer_discovery,
      official_count: officialTokens.filter((token) => token.routed_by_agent || token.trust_level === "official").length,
      other_count: officialTokens.filter((token) => !(token.routed_by_agent || token.trust_level === "official")).length,
      stock_like_count: officialTokens.length,
      tokens: officialTokens
    },
    stock_signals: {
      ...intel.stock_signals,
      prices,
      filings,
      news
    },
    kalshi: {
      ...intel.kalshi,
      searched_terms: searchedTerms,
      stocks: kalshiStocks
    },
    calendars,
    recommendations,
    hermes_decision: focusedDecision,
    agent_context: {
      ...intel.agent_context,
      stock_tokens: [stock],
      kalshi_matches: (intel.agent_context?.kalshi_matches || []).filter((row: { symbol?: string }) => row.symbol === normalized),
      calendars: (intel.agent_context?.calendars || []).filter((row: { symbol?: string }) => row.symbol === normalized),
      stock_signals: (intel.agent_context?.stock_signals || []).filter((row: { symbol?: string }) => row.symbol === normalized),
      recommendations,
      hermes_decision: focusedDecision
    }
  };
}

function tickerNiceReply(decision: StockIntel["hermes_decision"]) {
  const stock = decision.stocks[0];
  if (!stock) return decision.summary;
  return [
    `${stock.symbol}: ${stock.action} at ${stock.confidence}/100.`,
    `Why: ${stock.reason}`,
    `Next: ${stock.user_action}`
  ].join("\n");
}

function buildComparisonDataPipeline(tickerOutputs: Array<Awaited<ReturnType<typeof composeHermesOutput>>>) {
  return {
    system_prompt_version: HERMES_SYSTEM_PROMPT_VERSION,
    comparison_contract: {
      input_type: "completed_per_ticker_research_outputs",
      rule: "Compare ticker research outputs only after standalone ticker votes are complete.",
      anti_bias: "Do not alter a ticker's standalone research because another ticker is stronger; only rank quote-prep readiness."
    },
    ticker_outputs: tickerOutputs.map((output) => ({
      reply_source: output.reply_source,
      symbol: output.hermes_decision?.stocks?.[0]?.symbol,
      action: output.hermes_decision?.stocks?.[0]?.action,
      confidence: output.hermes_decision?.stocks?.[0]?.confidence,
      reason: output.hermes_decision?.stocks?.[0]?.reason,
      user_action: output.hermes_decision?.stocks?.[0]?.user_action,
      reply: output.reply,
      stock_reply: output.hermes_decision?.stocks?.[0]?.symbol
        ? output.stock_replies?.[output.hermes_decision.stocks[0].symbol]
        : undefined
    }))
  };
}

function buildComparisonSystemPrompt() {
  return [
    "You are Hermes Agent comparator for Robinhood Chain stock-token execution research.",
    "The app has already completed one standalone research pass per ticker. Treat COMPARISON_JSON as completed ticker memos, not raw evidence.",
    "Do not browse, fetch, call tools, or reinterpret raw source payloads.",
    "Do not change a ticker's standalone action because another ticker is better. Your job is only to rank readiness and explain the relative choice.",
    "Final vote must list every ticker action and confidence from the completed ticker memos.",
    "BUY means quote preparation may be shown, not execution. WATCH and NO_BUY must not ask the user to sign.",
    "Write reply in four compact sections with each heading on its own line exactly: Checked, Final vote, Why, Next.",
    "Checked must say standalone ticker research completed, then comparison pass completed.",
    "Why must explain the best setup and why the others stay lower priority. Do not use low displayed liquidity as the reason a ticker loses; only absence of a clean market, missing pricing, stale/missing public quote, missing filings, source degradation, or weak ticker-specific evidence should lower priority.",
    "Next must keep the wallet boundary explicit.",
    "Return only valid JSON with this shape: {\"verdict\":\"...\",\"summary\":\"...\",\"user_action\":\"...\",\"reply\":\"concise user-facing textual output\",\"stocks\":[{\"symbol\":\"TSLA\",\"action\":\"BUY|WATCH|NO_BUY|CONFIG_NEEDED\",\"confidence\":0,\"reason\":\"...\",\"user_action\":\"...\"}]}."
  ].join(" ");
}

async function askHermesComparison(
  tickerOutputs: Array<Awaited<ReturnType<typeof composeHermesOutput>>>,
  intel: StockIntel
): Promise<OpenRouterChatResult> {
  const apiKey = env("OPENROUTER_API_KEY");
  const model = env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash");
  if (!apiKey) {
    return { configured: false, ok: false, model, reply: null, vote: null, error: "OPENROUTER_API_KEY is not configured" };
  }

  const maxTokens = Number(env("OPENROUTER_MAX_TOKENS", "1800"));
  const timeoutMs = Number(env("OPENROUTER_TIMEOUT_MS", "90000"));
  const dataPipelineJson = JSON.stringify(buildComparisonDataPipeline(tickerOutputs));
  const response = await fetchJson<OpenRouterResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(10000, Math.trunc(timeoutMs)) : 90000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://hermes-agent-backend.vercel.app",
      "X-OpenRouter-Title": "Hermes Robinhood Chain",
      "X-Title": "Hermes Robinhood Chain"
    },
    body: {
      model,
      temperature: 0.15,
      max_tokens: Number.isFinite(maxTokens) ? Math.min(Math.max(Math.trunc(maxTokens), 256), 4096) : 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildComparisonSystemPrompt() },
        { role: "system", content: `COMPARISON_JSON=${dataPipelineJson}` },
        { role: "user", content: comparisonPrompt() }
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
      prompt_payload_bytes: dataPipelineJson.length,
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
    prompt_payload_bytes: dataPipelineJson.length,
    status: response.status,
    error: safeOpenRouterError(response.data) || response.error || (response.ok ? "openrouter_invalid_or_empty_comparison_vote" : "openrouter_request_failed"),
    finish_reason: choice?.finish_reason,
    provider_model: response.data?.model,
    usage: response.data?.usage
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

function normalizeVote(value: unknown, intel: StockIntel): LlmVote | null {
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

function buildOpenRouterDecision(vote: LlmVote, intel: StockIntel) {
  const voteBySymbol = new Map(vote.stocks.map((stock) => [stock.symbol, stock]));
  const actionCounts = { BUY: 0, WATCH: 0, NO_BUY: 0, CONFIG_NEEDED: 0 };
  const stocks = intel.hermes_decision.stocks.map((stock) => {
    const llm = voteBySymbol.get(stock.symbol);
    const guardedBuy = llm?.action === "BUY" && stock.action !== "BUY";
    const action = guardedBuy ? stock.action : llm?.action || stock.action;
    actionCounts[action] += 1;
    return {
      ...stock,
      action,
      label: labelForAction(action),
      confidence: guardedBuy ? Math.min(llm?.confidence ?? stock.confidence, stock.confidence) : llm?.confidence ?? stock.confidence,
      reason: guardedBuy
        ? `${llm?.reason || stock.reason} Hermes kept this at ${stock.action} because the deterministic source-quality guard did not clear quote prep.`
        : llm?.reason || stock.reason,
      user_action: guardedBuy ? stock.user_action : llm?.user_action || stock.user_action
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

function buildStockReplies(decision: StockIntel["hermes_decision"], intel: StockIntel) {
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

function joinHumanList(items: string[]) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function compactReason(value?: string, max = 210) {
  const text = value?.replace(/\s+/g, " ").trim() || "";
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function formatShortDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function buildNiceReply(decision: StockIntel["hermes_decision"], intel: StockIntel) {
  if (decision.stocks.length === 1) return tickerNiceReply(decision);
  const recommendationBySymbol = new Map(intel.recommendations.map((recommendation) => [recommendation.symbol, recommendation]));
  const buy = decision.stocks.filter((stock) => stock.action === "BUY");
  const watch = decision.stocks.filter((stock) => stock.action === "WATCH");
  const noBuy = decision.stocks.filter((stock) => stock.action === "NO_BUY");
  const configNeeded = decision.stocks.filter((stock) => stock.action === "CONFIG_NEEDED");
  const degraded = intel.pipeline.degraded_sources.length ? `\nSource note: Degraded source(s): ${intel.pipeline.degraded_sources.join(", ")}.` : "";

  const buyLead = buy.length
    ? buy.length === 1
      ? `Call: Hermes thinks ${buy[0].symbol} is the only buy setup worth preparing now.`
      : `Call: Hermes thinks ${joinHumanList(buy.map((stock) => stock.symbol))} are buy setups worth preparing now.`
    : "Hermes does not see a clean buy setup worth preparing right now.";
  const buyReasons = buy
    .map((stock) => {
      const recommendation = recommendationBySymbol.get(stock.symbol);
      const pricing = recommendation?.evidence.market_pricing?.spread_note;
      const quote = recommendation?.evidence.price_snapshot?.close ? `quote ${formatMoney(recommendation.evidence.price_snapshot.close)}` : "";
      const filing = recommendation?.evidence.latest_filing
        ? `SEC ${recommendation.evidence.latest_filing.form}${recommendation.evidence.latest_filing.filing_date ? ` ${formatShortDate(recommendation.evidence.latest_filing.filing_date)}` : ""}`
        : "";
      const earnings = recommendation?.evidence.earnings_dates?.[0] ? `earnings ${formatShortDate(recommendation.evidence.earnings_dates[0])}` : "";
      const support = [pricing, quote, filing, earnings].filter(Boolean).join("; ");
      return `${stock.symbol}: ${support || compactReason(stock.reason)}`;
    })
    .filter(Boolean);
  const holdList = [...watch, ...noBuy, ...configNeeded];
  const watchReason = watch.length
    ? `Watch: ${joinHumanList(watch.map((stock) => stock.symbol))} ${watch.length === 1 ? "has" : "have"} route/context, but not enough conviction for quote prep.`
    : "";
  const noBuyReason = noBuy.length ? `No buy: ${joinHumanList(noBuy.map((stock) => stock.symbol))} should stay hidden from quote prep until evidence improves.` : "";
  const configReason = configNeeded.length ? `Config needed: ${joinHumanList(configNeeded.map((stock) => stock.symbol))} needs source repair before any trade call.` : "";
  const holdReason = holdList.length
    ? `Why not the others: ${holdList.some((stock) => stock.action === "CONFIG_NEEDED") ? "one or more required sources need attention" : "the evidence is useful, but not clean enough for a wallet prompt."}`
    : "";

  return [
    buyLead,
    buyReasons.length ? `Why: ${buyReasons.join(" | ")}` : "",
    holdReason,
    watchReason,
    noBuyReason,
    configReason,
    `Next: Prepare a quote only after you accept the evidence and confirm the wallet-signing step.${degraded}`
  ].filter(Boolean).join("\n");
}

async function askHermes(message: string, intel: StockIntel): Promise<OpenRouterChatResult> {
  const apiKey = env("OPENROUTER_API_KEY");
  const model = env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash");
  if (!apiKey) {
    return { configured: false, ok: false, model, reply: null, vote: null, error: "OPENROUTER_API_KEY is not configured" };
  }

  const maxTokens = Number(env("OPENROUTER_MAX_TOKENS", "1800"));
  const timeoutMs = Number(env("OPENROUTER_TIMEOUT_MS", "90000"));
  const dataPipelineJson = JSON.stringify(buildOpenRouterDataPipeline(intel));
  const response = await fetchJson<OpenRouterResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(10000, Math.trunc(timeoutMs)) : 90000,
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
          content: `DATA_PIPELINE_JSON=${dataPipelineJson}`
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
      prompt_payload_bytes: dataPipelineJson.length,
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
    prompt_payload_bytes: dataPipelineJson.length,
    status: response.status,
    error: safeOpenRouterError(response.data) || response.error || (response.ok ? "openrouter_invalid_or_empty_vote" : "openrouter_request_failed"),
    finish_reason: choice?.finish_reason,
    provider_model: response.data?.model,
    usage: response.data?.usage
  };
}

async function composeHermesOutput(intel: StockIntel, message: string, options: { debug?: boolean; scope?: "ticker" | "comparison" | "desk" } = {}) {
  const chat = await askHermes(message, intel);
  const finalDecision = chat.vote ? buildOpenRouterDecision(chat.vote, intel) : intel.hermes_decision;
  const replySource = chat.vote ? "openrouter" : "fallback";
  const reply = chat.vote ? chat.vote.reply || decisionReply(finalDecision, intel) : fallbackReply(intel);
  const niceReply = buildNiceReply(finalDecision, intel);
  return {
    reply,
    nice_reply: niceReply,
    text_output: niceReply,
    reply_source: replySource,
    vote_source: replySource,
    research_scope: options.scope || (intel.hermes_decision.stocks.length === 1 ? "ticker" : "desk"),
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
        prompt_payload_bytes: chat.prompt_payload_bytes,
        provider_model: chat.provider_model,
        status: chat.status,
        finish_reason: chat.finish_reason,
        error: chat.error,
        usage: chat.usage
      }
    ]
  };
}

export async function buildHermesComparisonOutput(options: { debug?: boolean; bypassCache?: boolean } = {}) {
  try {
    const intel = await buildStockIntel({ bypassCache: options.bypassCache });
    const tickerOutputs = await Promise.all(
      intel.robinhood_chain.stocks.map((stock) =>
        composeHermesOutput(focusStockIntel(intel, stock.symbol), tickerResearchPrompt(stock.symbol), {
          debug: options.debug,
          scope: "ticker"
        })
      )
    );
    const comparison = await askHermesComparison(tickerOutputs, intel);
    const perTickerVotes = tickerOutputs
      .map((output) => output.hermes_decision.stocks[0])
      .filter((stock): stock is StockIntel["hermes_decision"]["stocks"][number] => Boolean(stock));
    const mergedDecision = {
      ...intel.hermes_decision,
      verdict: perTickerVotes.some((stock) => stock.action === "BUY") ? "Parallel ticker research comparison complete" : "Parallel ticker research found no buy setup",
      summary: "Standalone ticker research completed first; comparison pass ranked the finished ticker memos.",
      action_counts: actionCountsFor(perTickerVotes),
      stocks: perTickerVotes
    };
    const finalDecision = comparison.vote ? buildOpenRouterDecision(comparison.vote, { ...intel, hermes_decision: mergedDecision }) : mergedDecision;
    const replySource = comparison.vote ? "openrouter" : "fallback";
    const reply = comparison.vote?.reply || decisionReply(finalDecision, { ...intel, hermes_decision: finalDecision });
    const niceReply = buildNiceReply(finalDecision, { ...intel, hermes_decision: finalDecision });
    return {
      reply,
      nice_reply: niceReply,
      text_output: niceReply,
      reply_source: replySource,
      vote_source: replySource,
      research_scope: "comparison",
      llm_vote: comparison.vote,
      ticker_outputs: tickerOutputs.map((output) => ({
        symbol: output.hermes_decision.stocks[0]?.symbol,
        reply_source: output.reply_source,
        vote_source: output.vote_source,
        reply: output.reply,
        nice_reply: output.nice_reply,
        hermes_decision: output.hermes_decision,
        tool_trace: output.tool_trace
      })),
      stock_replies: buildStockReplies(finalDecision, { ...intel, hermes_decision: finalDecision }),
      ui_brief_source: "ticker_outputs_then_comparison",
      system_prompt_version: HERMES_SYSTEM_PROMPT_VERSION,
      hermes_decision: finalDecision,
      data: options.debug ? intel : compactStockIntel(intel),
      tool_trace: [
        {
          name: "buildStockIntel",
          ok: intel.ok,
          role: "shared_source_fetch_for_parallel_ticker_research",
          degraded_sources: intel.pipeline.degraded_sources
        },
        {
          name: "parallel_ticker_research",
          ok: tickerOutputs.every((output) => output.reply_source === "openrouter"),
          role: "standalone_ticker_votes",
          tickers: tickerOutputs.map((output) => output.hermes_decision.stocks[0]?.symbol).filter(Boolean)
        },
        {
          name: "openrouter_comparison",
          ok: comparison.ok,
          configured: comparison.configured,
          role: "compare_completed_ticker_research_outputs",
          model: comparison.model,
          prompt_payload_bytes: comparison.prompt_payload_bytes,
          provider_model: comparison.provider_model,
          status: comparison.status,
          finish_reason: comparison.finish_reason,
          error: comparison.error,
          usage: comparison.usage
        }
      ]
    };
  } catch (error) {
    return buildHermesOutput(undefined, { ...options });
  }
}

export async function buildHermesOutput(message = DEFAULT_HERMES_OUTPUT_PROMPT, options: HermesOutputOptions = {}) {
  try {
    const baseIntel = await buildStockIntel({ bypassCache: options.bypassCache });
    const symbol = normalizeSymbol(options.symbol);
    const intel = symbol ? focusStockIntel(baseIntel, symbol) : baseIntel;
    const prompt = symbol ? tickerResearchPrompt(symbol) : message;
    return await composeHermesOutput(intel, prompt, {
      debug: options.debug,
      scope: symbol ? "ticker" : "desk"
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    const niceReply = `Hermes cannot produce a clean buy or no-buy read right now because output generation failed. Retry after checking OpenRouter, network endpoints, and required env vars. Detail: ${messageText || "unknown error"}`;
    return {
      reply: niceReply,
      nice_reply: niceReply,
      text_output: niceReply,
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
