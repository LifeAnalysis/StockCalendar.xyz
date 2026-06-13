import { env } from "./env";
import { fetchJson } from "./http";
import { buildStockIntel } from "./intel";
import { prepareStockTrade, robinhoodPaymentTokens, robinhoodStockTokens, type StockTradeInput } from "./robinhood";
import { fetchYahooChart, type ChartSnapshot } from "./stock-signals";

type AgentContext = {
  selectedSymbol?: string;
  side?: string;
  amount?: string;
  walletAddress?: string;
  connected?: boolean;
  connectedToRobinhood?: boolean;
  sourceAsset?: string;
  targetAsset?: string;
  payTokenSymbol?: string;
  quoteReady?: boolean;
  backendTradeReady?: boolean;
};

type AgentMessage = {
  role?: string;
  content?: string;
};

type AgentAction = {
  type: string;
  label: string;
  payload?: Record<string, unknown>;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  model?: string;
  usage?: unknown;
  error?: unknown;
};

const ACTION_WORDS = {
  quote: ["quote", "swap", "buy", "sell", "prepare", "prepara", "compra", "vendi", "scambia"],
  compare: ["compare", "confronta", "best", "migliore", "which", "quale"],
  liquidity: ["liquidity", "liquidita", "liquidità", "pool", "pair", "pairs", "dex", "route", "routing"],
  explain: ["why", "perche", "perché", "explain", "spiega", "reason", "route"],
  web: ["internet", "web", "search", "cerca", "cercami", "news", "notizie", "latest", "ultime", "catalyst", "catalizzatori"],
  quant: ["quant", "quantitativa", "quantitative", "volatility", "volatilità", "momentum", "rsi", "sma", "technical", "tecnica", "chart", "prezzo", "price"]
};

function normalizeSymbol(value?: string) {
  const text = String(value || "").trim().toUpperCase();
  return robinhoodStockTokens.some((stock) => stock.symbol === text) ? text : "";
}

function detectSymbol(message: string, context: AgentContext) {
  const upper = message.toUpperCase();
  return robinhoodStockTokens.find((stock) => upper.includes(stock.symbol))?.symbol || normalizeSymbol(context.selectedSymbol) || "TSLA";
}

function includesAny(message: string, words: string[]) {
  const lower = message.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function detectIntent(message: string) {
  if (includesAny(message, ACTION_WORDS.quote)) return "prepare_quote";
  if (includesAny(message, ACTION_WORDS.quant)) return "quant_analysis";
  if (includesAny(message, ACTION_WORDS.web)) return "web_research";
  if (includesAny(message, ACTION_WORDS.compare)) return "compare";
  if (includesAny(message, ACTION_WORDS.explain)) return "explain_route";
  if (includesAny(message, ACTION_WORDS.liquidity)) return "check_liquidity";
  return "general";
}

function pctChange(from?: number, to?: number) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || !from) return null;
  return ((Number(to) - Number(from)) / Number(from)) * 100;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const mean = average(values);
  if (mean === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function quantSnapshot(chart: ChartSnapshot | null) {
  if (!chart?.ok || chart.data.length < 2) return null;
  const closes = chart.data.map((point) => point.close).filter((value) => Number.isFinite(value));
  const latest = closes.at(-1);
  const previous = closes.at(-2);
  const first = closes[0];
  const returns = closes.slice(1).map((close, index) => {
    const prior = closes[index];
    return prior ? (close - prior) / prior : 0;
  });
  const dailyVol = standardDeviation(returns);
  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-50));
  return {
    source: chart.source,
    range: chart.range,
    interval: chart.interval,
    observations: closes.length,
    latest_close: latest,
    latest_date: chart.data.at(-1)?.date,
    one_period_change_pct: pctChange(previous, latest),
    range_change_pct: pctChange(first, latest),
    annualized_volatility_pct: dailyVol === null ? null : dailyVol * Math.sqrt(252) * 100,
    sma20,
    sma50,
    trend: latest && sma20 ? (latest > sma20 ? "above_20_period_average" : "below_20_period_average") : "unknown"
  };
}

function compactHistory(history: AgentMessage[]) {
  return history
    .slice(-6)
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: String(message.content || "").slice(0, 500)
    }))
    .filter((message) => message.content);
}

function stockSnapshot(symbol: string, intel: Awaited<ReturnType<typeof buildStockIntel>>) {
  const recommendation = intel.recommendations.find((item) => item.symbol === symbol);
  const decision = intel.hermes_decision.stocks.find((item) => item.symbol === symbol);
  const stock = robinhoodStockTokens.find((item) => item.symbol === symbol);
  const evidence = recommendation?.evidence;
  return {
    symbol,
    name: stock?.name,
    action: decision?.action || recommendation?.action,
    confidence: decision?.confidence || recommendation?.confidence,
    reason: decision?.reason || recommendation?.rationale,
    user_action: decision?.user_action || recommendation?.user_action,
    routeable: Boolean(evidence?.official_contract),
    explorer_confirmed: evidence?.explorer_confirmed,
    kalshi_match_count: evidence?.kalshi_match_count || 0,
    top_market: evidence?.top_kalshi_market
      ? {
          ticker: evidence.top_kalshi_market.ticker,
          title: evidence.top_kalshi_market.title,
          yes_bid: evidence.top_kalshi_market.yes_bid_dollars,
          yes_ask: evidence.top_kalshi_market.yes_ask_dollars,
          no_bid: evidence.top_kalshi_market.no_bid_dollars,
          no_ask: evidence.top_kalshi_market.no_ask_dollars
        }
      : null,
    price: evidence?.price_snapshot
      ? {
          close: evidence.price_snapshot.close,
          date: evidence.price_snapshot.date,
          source: evidence.price_snapshot.source
        }
      : null,
      latest_filing: evidence?.latest_filing
      ? {
          form: evidence.latest_filing.form,
          filing_date: evidence.latest_filing.filing_date
        }
      : null,
    news_count: evidence?.news_count || 0,
    top_news: evidence?.top_news || []
  };
}

function tradeInputFromContext(context: AgentContext, symbol: string): StockTradeInput | null {
  const stock = robinhoodStockTokens.find((item) => item.symbol === symbol);
  const weth = robinhoodPaymentTokens.find((token) => token.symbol === "WETH");
  if (!stock || !weth || !context.walletAddress || !context.amount) return null;
  const side = context.side === "sell" ? "sell" : "buy";
  return {
    action: side,
    source_asset: side === "sell" ? stock.address : weth.address,
    target_asset: side === "sell" ? weth.address : stock.address,
    amount: context.amount,
    wallet_address: context.walletAddress,
    provider: "auto",
    strategy: `Hermes Agent ${side} route for ${symbol}`
  };
}

async function maybePrepareQuote(intent: string, context: AgentContext, symbol: string) {
  if (intent !== "prepare_quote") return null;
  const input = tradeInputFromContext(context, symbol);
  if (!input) return null;
  return prepareStockTrade(input);
}

async function maybeQuant(intent: string, symbol: string) {
  if (intent !== "quant_analysis") return null;
  const stock = robinhoodStockTokens.find((item) => item.symbol === symbol);
  if (!stock) return null;
  const chart = await fetchYahooChart(stock, "3mo", "1d");
  return quantSnapshot(chart);
}

function deterministicActions(intent: string, context: AgentContext, symbol: string, preparedQuote: unknown): AgentAction[] {
  const actions: AgentAction[] = [];
  if (!context.connected) actions.push({ type: "connect_wallet", label: "Connect wallet" });
  else if (!context.connectedToRobinhood) actions.push({ type: "switch_network", label: "Switch to Robinhood" });

  if (preparedQuote && typeof preparedQuote === "object" && "ok" in preparedQuote && (preparedQuote as { ok?: unknown }).ok) {
    actions.push({ type: "use_prepared_quote", label: "Load prepared quote", payload: { quote: preparedQuote } });
  } else if (intent === "prepare_quote") {
    actions.push({ type: "prepare_quote", label: `Prepare ${symbol} quote`, payload: { symbol } });
  }

  if (intent === "compare") {
    for (const stock of robinhoodStockTokens.slice(0, 5)) {
      actions.push({ type: "select_stock", label: `Open ${stock.symbol}`, payload: { symbol: stock.symbol } });
    }
  }

  if (intent === "web_research") {
    actions.push({
      type: "news_scan",
      label: `Scan latest ${symbol} news`,
      payload: { symbol, prompt: `Scan recent public news and catalysts for ${symbol}. Return the top headlines, source context, and why they matter for the current stock-token setup.` }
    });
    actions.push({
      type: "quant_analysis",
      label: `Run quant on ${symbol}`,
      payload: { symbol, prompt: `Run a quant snapshot for ${symbol}. Include recent price change, momentum, volatility, moving-average context, and a concise trading-readiness takeaway.` }
    });
  }

  if (intent === "quant_analysis") {
    actions.push({
      type: "web_research",
      label: `Add news context for ${symbol}`,
      payload: { symbol, prompt: `Add recent public news context for ${symbol}. Focus on catalysts, earnings or filing updates, notable headlines, and how the news changes the quant read.` }
    });
    actions.push({ type: "prepare_quote", label: `Prepare ${symbol} quote`, payload: { symbol } });
  }

  if (!context.amount && intent === "prepare_quote") {
    actions.push({ type: "set_amount", label: "Use 0.001 ETH", payload: { amount: "0.001", side: "buy" } });
  }
  return actions.slice(0, 5);
}

function sanitizeActions(actions: unknown): AgentAction[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .map((action) => {
      if (!action || typeof action !== "object") return null;
      const candidate = action as { type?: unknown; label?: unknown; payload?: unknown };
      if (typeof candidate.type !== "string" || !/^[a-z][a-z0-9_:-]{1,48}$/i.test(candidate.type)) return null;
      if (typeof candidate.label !== "string" || !candidate.label.trim()) return null;
      return {
        type: candidate.type.trim().slice(0, 50),
        label: candidate.label.trim().slice(0, 80),
        payload: candidate.payload && typeof candidate.payload === "object" ? candidate.payload as Record<string, unknown> : undefined
      };
    })
    .filter(Boolean)
    .slice(0, 5) as AgentAction[];
}

function mergeActions(requiredActions: AgentAction[], modelActions: AgentAction[]) {
  const seen = new Set<string>();
  const merged: AgentAction[] = [];
  for (const action of [...requiredActions, ...modelActions]) {
    const payload = action.payload || {};
    const key = `${action.type}:${String(payload.symbol || "")}:${String(payload.amount || "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(action);
    if (merged.length >= 5) break;
  }
  return merged;
}

function deterministicReply(intent: string, context: AgentContext, symbol: string, intel: Awaited<ReturnType<typeof buildStockIntel>>, preparedQuote: unknown) {
  const snapshot = stockSnapshot(symbol, intel);
  const provider = "Hobin";
  if (intent === "prepare_quote") {
    if (preparedQuote && typeof preparedQuote === "object" && "ok" in preparedQuote && (preparedQuote as { ok?: unknown }).ok) {
      return `${provider} quote is ready for ${symbol}. I prepared wallet-signable calldata only; your wallet still has to sign. Review amount, route, and slippage before sending.`;
    }
    if (!context.connected) return `I can prepare a ${symbol} quote after the wallet is connected. Execution remains wallet-owned.`;
    if (!context.connectedToRobinhood) return `Switch to Robinhood Chain first, then I can prepare the ${symbol} Hobin quote.`;
    if (!context.amount) return `Set an amount first. A small test amount like 0.001 ETH is the safest path on testnet.`;
    return `I could not prepare the ${symbol} quote from the current context. Check amount, wallet, and token route.`;
  }
  if (intent === "compare") {
    const ranked = intel.recommendations
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((item) => `${item.symbol} ${item.action} ${item.confidence}%`)
      .join(", ");
    return `Current readiness ranking: ${ranked}. Treat this as research, not execution. Use the ticket when you want calldata prepared.`;
  }
  if (intent === "check_liquidity") {
    return `${symbol} routes through Hobin WETH/stock pools on Robinhood Chain testnet. The app prepares calldata and leaves signing to the connected wallet.`;
  }
  if (intent === "web_research") {
    const articles = snapshot.top_news?.slice(0, 3).map((article) => article.title).join("; ");
    return articles
      ? `${symbol} public web/news scan found ${snapshot.news_count} article(s): ${articles}. Treat this as catalyst research before any DEX quote.`
      : `${symbol} web/news scan did not return clean current articles from the configured public feeds. I can still run quant or explain the on-chain route.`;
  }
  if (intent === "quant_analysis") {
    return `I can run a quant snapshot for ${symbol} using public Yahoo chart data: momentum, recent change, volatility, and moving-average context.`;
  }
  if (intent === "explain_route") {
    return `${symbol}: ${snapshot.action || "WATCH"} at ${snapshot.confidence || 0} confidence. Route is official-token based and DEX quote prep is wallet-bound. ${snapshot.reason || "No extra model reason is available."}`;
  }
  return `I can explain ${symbol}, compare the desk, check Hobin liquidity, or prepare a wallet-signable quote. I will not sign or broadcast transactions server-side.`;
}

function parseOpenRouterJson(content?: string) {
  if (!content) return null;
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function callOpenRouterAgent(input: {
  message: string;
  intent: string;
  context: AgentContext;
  symbol: string;
  intel: Awaited<ReturnType<typeof buildStockIntel>>;
  preparedQuote: unknown;
  quant: ReturnType<typeof quantSnapshot> | null;
  history: AgentMessage[];
}) {
  const apiKey = env("OPENROUTER_API_KEY");
  const model = env("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash");
  if (!apiKey) return { configured: false, ok: false, model, reply: null, actions: null, error: "OPENROUTER_API_KEY is not configured" };

  const data = {
    intent: input.intent,
    selected_stock: stockSnapshot(input.symbol, input.intel),
    desk: input.intel.recommendations.map((item) => ({ symbol: item.symbol, action: item.action, confidence: item.confidence })),
    wallet: {
      connected: Boolean(input.context.connected),
      connected_to_robinhood: Boolean(input.context.connectedToRobinhood),
      wallet_present: Boolean(input.context.walletAddress)
    },
    trade_ticket: {
      side: input.context.side,
      amount: input.context.amount,
      pay_token: input.context.payTokenSymbol,
      quote_ready: Boolean(input.context.quoteReady),
      backend_trade_ready: Boolean(input.context.backendTradeReady)
    },
    prepared_quote: input.preparedQuote
      ? {
          ok: (input.preparedQuote as { ok?: unknown }).ok,
          provider: (input.preparedQuote as { provider?: unknown }).provider,
          action: (input.preparedQuote as { action?: unknown }).action,
          message: (input.preparedQuote as { message?: unknown }).message,
          has_transaction_request: Boolean((input.preparedQuote as { transactionRequest?: unknown }).transactionRequest),
          has_transactions: Array.isArray((input.preparedQuote as { transactions?: unknown }).transactions)
        }
      : null,
    quant_analysis: input.quant,
    research_feeds: {
      web_news: "GDELT + Yahoo Finance RSS/search fallback",
      charts: "Yahoo Finance chart",
      filings: "SEC EDGAR",
      prediction_markets: "Kalshi public markets"
    }
  };

  const response = await fetchJson<OpenRouterResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": env("NEXT_PUBLIC_SITE_URL", "https://hermes-agent-backend.vercel.app"),
      "X-Title": "Hermes Robinhood Chain"
    },
    timeoutMs: Number(env("OPENROUTER_TIMEOUT_MS", "90000")),
    body: {
      model,
      max_tokens: 700,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You are Hermes Agent, a concise Robinhood Chain testnet DEX copilot.",
            "Use only AGENT_CONTEXT_JSON. Do not claim to browse or execute tools during this model call.",
            "Keep three boundaries explicit: research signal, DEX quote preparation, wallet execution.",
            "The current primary DEX is Hobin. RH Swap is only fallback/discovery unless supplied as provider.",
            "Never say a transaction was sent unless a tx hash is supplied. Never ask the server to sign.",
            "You can answer research, web/news, catalyst, and quant-analysis requests using supplied public feeds.",
            "Known executable UI actions are prepare_quote, use_prepared_quote, switch_network, connect_wallet, select_stock, set_amount.",
            "You may also return informational actions such as web_research, news_scan, quant_analysis, screening, explain_risk, or another concise snake_case type.",
            "Return only JSON: {\"reply\":\"...\",\"actions\":[{\"type\":\"string_action_type\",\"label\":\"...\",\"payload\":{\"prompt\":\"optional follow-up prompt\"}}],\"warnings\":[\"...\"],\"sources\":[\"...\"]}."
          ].join(" ")
        },
        ...compactHistory(input.history),
        {
          role: "user",
          content: `USER_MESSAGE: ${input.message}\nAGENT_CONTEXT_JSON: ${JSON.stringify(data)}`
        }
      ]
    }
  });

  const content = response.data?.choices?.[0]?.message?.content;
  const parsed = parseOpenRouterJson(content);
  if (!response.ok || (!parsed && !content) || (parsed && typeof parsed.reply !== "string")) {
    return {
      configured: true,
      ok: false,
      model,
      reply: null,
      actions: null,
      status: response.status,
      error: response.error || "openrouter_agent_invalid_response"
    };
  }

  if (!parsed && content) {
    return {
      configured: true,
      ok: true,
      model,
      reply: content.trim().slice(0, 1200),
      actions: [],
      warnings: ["Model returned text instead of structured JSON; action buttons were generated by the app."],
      sources: [],
      finish_reason: response.data?.choices?.[0]?.finish_reason,
      usage: response.data?.usage
    };
  }

  return {
    configured: true,
    ok: true,
    model,
    reply: String(parsed.reply).slice(0, 1200),
    actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5) : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 5) : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 5) : [],
    finish_reason: response.data?.choices?.[0]?.finish_reason,
    usage: response.data?.usage
  };
}

export async function runHermesAgent(input: { message: string; context?: AgentContext; history?: AgentMessage[] }) {
  const message = String(input.message || "").trim();
  const context = input.context || {};
  const history = Array.isArray(input.history) ? input.history : [];
  const intent = detectIntent(message);
  const symbol = detectSymbol(message, context);
  const intel = await buildStockIntel();
  const [preparedQuote, quant] = await Promise.all([
    maybePrepareQuote(intent, context, symbol),
    maybeQuant(intent, symbol)
  ]);
  const fallbackReply = deterministicReply(intent, context, symbol, intel, preparedQuote);
  const fallbackActions = deterministicActions(intent, context, symbol, preparedQuote);
  const llm = await callOpenRouterAgent({ message, intent, context, symbol, intel, preparedQuote, quant, history });
  const modelActions = llm.ok ? sanitizeActions(llm.actions) : [];

  return {
    ok: true,
    intent,
    symbol,
    reply: llm.ok && llm.reply ? llm.reply : fallbackReply,
    reply_source: llm.ok ? "openrouter" : "fallback",
    model: llm.model,
    actions: mergeActions(fallbackActions, modelActions),
    warnings: [
      "Quote preparation only. Wallet signature is required for execution.",
      ...(llm.ok && Array.isArray(llm.warnings) ? llm.warnings : [])
    ].slice(0, 5),
    sources: llm.ok && Array.isArray(llm.sources) && llm.sources.length ? llm.sources : ["Hobin DEX", "Robinhood Chain RPC", "Hermes stock intel"],
    prepared_quote: preparedQuote,
    quant_analysis: quant,
    selected_stock: stockSnapshot(symbol, intel),
    openrouter: {
      configured: llm.configured,
      ok: llm.ok,
      error: llm.ok ? undefined : llm.error,
      finish_reason: llm.ok ? llm.finish_reason : undefined
    }
  };
}
