"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

const Dither = dynamic(() => import("./components/Dither"), { ssr: false });

type Stock = {
  symbol: string;
  name: string;
  address: string;
  chainId?: number;
  kind?: "stock" | "payment";
  aliases: string[];
  logoUrl?: string;
  brandColor?: string;
};

type StockCatalog = {
  ok: boolean;
  source: string;
  chainId: number;
  stocks: Stock[];
  payment_tokens: Stock[];
};

type Market = {
  score: number;
  ticker: string;
  title?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  no_bid_dollars?: string;
  no_ask_dollars?: string;
  close_time?: string;
  liquidity_dollars?: string;
  volume_24h_fp?: string;
};

type Recommendation = {
  symbol: string;
  recommendation: "prepare_quote" | "watch" | "wait_for_cleaner_data";
  action: "BUY" | "WATCH" | "NO_BUY" | "CONFIG_NEEDED";
  label: string;
  confidence: number;
  rationale: string;
  user_action: string;
  evidence: {
    official_contract: string;
    kalshi_match_count: number;
    top_kalshi_market?: Market;
    market_pricing?: {
      yes_bid?: string;
      yes_ask?: string;
      no_bid?: string;
      no_ask?: string;
      spread_note: string;
    };
    price_snapshot?: {
      close?: number;
      date?: string;
      volume?: number;
      source: string;
    };
    latest_filing?: {
      form: string;
      filing_date?: string;
      document_url?: string;
    };
    news_count: number;
    top_news: Array<{ title: string; url?: string; domain?: string }>;
    calendar_ok: boolean;
    earnings_dates: string[];
    explorer_confirmed: boolean;
  };
  quote_requirements: string[];
};

type ExplorerToken = {
  symbol: string;
  name: string;
  address: string;
  token_type: string;
  is_verified: boolean;
  token_url?: string;
  trust_level: "official" | "protocol_wrapper" | "third_party_or_mock";
  routed_by_agent: boolean;
};

type Intel = {
  ok: boolean;
  timestamp: string;
  pipeline: {
    ok: boolean;
    required_ok: boolean;
    degraded_sources: string[];
    checks: Array<{ name: string; ok: boolean; required: boolean; source: string; note?: string; records: number; error?: string }>;
  };
  robinhood_chain: {
    stocks: Stock[];
    payment_tokens: Stock[];
    stock_count?: number;
    source: string;
  };
  explorer_discovery?: {
    ok: boolean;
    source: string;
    stock_like_count: number;
    official_count: number;
    other_count: number;
    tokens: ExplorerToken[];
  };
  kalshi: {
    source: string;
    source_note: string;
    search_method: string;
    searched_terms: string[];
    scanned_markets: number;
    stocks: Array<{ stock: Stock; match_count: number; markets: Market[] }>;
  };
  stock_signals: {
    ok: boolean;
    source_note: string;
    prices: Array<{ symbol: string; ok: boolean; close?: number; date?: string; volume?: number; source: string; error?: string }>;
    filings: Array<{ symbol: string; ok: boolean; recent_material_count: number; recent_forms: string[]; error?: string }>;
    news: Array<{ symbol: string; ok: boolean; article_count: number; top_articles: Array<{ title: string; url?: string; domain?: string }> }>;
  };
  calendars: Array<{
    symbol: string;
    ok: boolean;
    source: string;
    earnings_dates: string[];
    estimates: { earnings_average?: string; revenue_average?: string };
    public_links: string[];
  }>;
  recommendations: Recommendation[];
  hermes_decision: {
    verdict: string;
    summary: string;
    source_note: string;
    user_action: string;
    action_counts: Record<"BUY" | "WATCH" | "NO_BUY" | "CONFIG_NEEDED", number>;
  };
  agent_context: unknown;
};

type Health = {
  runtime: string;
  model?: string;
  openrouter_configured: boolean;
  nuvolari_configured: boolean;
  robinhood_chain: {
    rpc_configured: boolean;
    chainId: number;
    explorer: string;
    stock_trade_tool?: string;
  };
};

type ChainStatus = {
  ok: boolean;
  latestBlock?: number;
  chain?: {
    chainId: number;
    observedChainId?: number | null;
    explorer: string;
    rpc_configured: boolean;
  };
};

type HermesOutput = {
  reply?: string;
  hermes_decision?: Intel["hermes_decision"];
  data?: Intel;
  tool_trace?: Array<{ name: string; ok: boolean; degraded_sources?: string[] }>;
};

const shortAddress = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const formatPrice = (value?: number) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value >= 100 ? 2 : 4
      }).format(value)
    : "n/a";

const formatVolume = (value?: number) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(value)
    : "n/a";

const formatDate = (value?: string) => {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const hostLabel = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
};

function Logo({ stock, size = "normal" }: { stock: Stock; size?: "normal" | "large" }) {
  return (
    <span className={`logo ${size}`} style={{ "--brand": stock.brandColor || "#2d6cdf" } as CSSProperties}>
      {stock.logoUrl ? (
        <span
          aria-hidden="true"
          className="logo-image"
          style={{ backgroundImage: `url(${stock.logoUrl})` }}
        />
      ) : null}
      <span>{stock.symbol.slice(0, 2)}</span>
    </span>
  );
}

function StatusDot({ label, active, detail }: { label: string; active: boolean; detail: string }) {
  return (
    <div className={`status-dot ${active ? "active" : "attention"}`}>
      <span>{label}</span>
      <strong>{detail}</strong>
    </div>
  );
}

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null);
  const [chainStatus, setChainStatus] = useState<ChainStatus | null>(null);
  const [stockCatalog, setStockCatalog] = useState<StockCatalog | null>(null);
  const [intel, setIntel] = useState<Intel | null>(null);
  const [selected, setSelected] = useState("TSLA");
  const [payToken, setPayToken] = useState("USDG");
  const [action, setAction] = useState<"buy" | "sell" | "swap">("buy");
  const [sourceAsset, setSourceAsset] = useState("");
  const [targetAsset, setTargetAsset] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [tradeResult, setTradeResult] = useState<unknown>(null);
  const [tradeError, setTradeError] = useState("");
  const [hermesOutput, setHermesOutput] = useState<HermesOutput | null>(null);
  const [hermesOutputError, setHermesOutputError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [healthRes, statusRes, stocksRes, outputRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/robinhood/status"),
        fetch("/api/robinhood/stocks"),
        fetch("/api/hermes/output")
      ]);
      const nextHealth = (await healthRes.json()) as Health;
      const nextStatus = (await statusRes.json()) as ChainStatus;
      const nextCatalog = (await stocksRes.json()) as StockCatalog;
      const nextOutput = (await outputRes.json()) as HermesOutput;
      const nextIntel = nextOutput.data;
      setHealth(nextHealth);
      setChainStatus(nextStatus);
      setStockCatalog(nextCatalog);
      setIntel(nextIntel || null);
      setHermesOutput(nextOutput);
      setHermesOutputError("");
      const nextStocks = nextCatalog.stocks.length ? nextCatalog.stocks : nextIntel?.robinhood_chain.stocks || [];
      const nextPaymentTokens = nextCatalog.payment_tokens.length
        ? nextCatalog.payment_tokens
        : nextIntel?.robinhood_chain.payment_tokens || [];
      const nextAssets = [...nextPaymentTokens, ...nextStocks];
      if (!nextStocks.some((stock) => stock.symbol === selected)) {
        setSelected(nextStocks[0]?.symbol || "TSLA");
      }
      if (!nextPaymentTokens.some((token) => token.symbol === payToken)) {
        setPayToken(nextPaymentTokens[0]?.symbol || "USDG");
      }
      setSourceAsset((current) =>
        nextAssets.some((asset) => asset.address === current)
          ? current
          : nextPaymentTokens[0]?.address || nextStocks[0]?.address || ""
      );
      setTargetAsset((current) =>
        nextAssets.some((asset) => asset.address === current) ? current : nextStocks[0]?.address || ""
      );
    } catch (error) {
      setHermesOutputError(error instanceof Error ? error.message : "Hermes output failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stockUniverse = useMemo(
    () => (stockCatalog?.stocks.length ? stockCatalog.stocks : intel?.robinhood_chain.stocks || []),
    [intel, stockCatalog]
  );
  const paymentUniverse = useMemo(
    () =>
      stockCatalog?.payment_tokens.length
        ? stockCatalog.payment_tokens
        : intel?.robinhood_chain.payment_tokens || [],
    [intel, stockCatalog]
  );
  const allAssets = useMemo(() => [...paymentUniverse, ...stockUniverse], [paymentUniverse, stockUniverse]);
  const selectedStock = useMemo(() => stockUniverse.find((stock) => stock.symbol === selected), [selected, stockUniverse]);
  const selectedPayToken = useMemo(() => paymentUniverse.find((token) => token.symbol === payToken), [payToken, paymentUniverse]);
  const selectedSourceAsset = useMemo(
    () => allAssets.find((asset) => asset.address === sourceAsset),
    [allAssets, sourceAsset]
  );
  const selectedTargetAsset = useMemo(
    () => allAssets.find((asset) => asset.address === targetAsset),
    [allAssets, targetAsset]
  );
  const selectedMarkets = useMemo(
    () => intel?.kalshi.stocks.find((row) => row.stock.symbol === selected)?.markets || [],
    [intel, selected]
  );
  const selectedCalendar = useMemo(() => intel?.calendars.find((row) => row.symbol === selected), [intel, selected]);
  const selectedRecommendation = useMemo(
    () => intel?.recommendations.find((row) => row.symbol === selected),
    [intel, selected]
  );
  const recommendationBySymbol = useMemo(
    () => new Map((intel?.recommendations || []).map((row) => [row.symbol, row])),
    [intel]
  );
  const explorerOtherTokens = useMemo(
    () => intel?.explorer_discovery?.tokens.filter((token) => !token.routed_by_agent).slice(0, 12) || [],
    [intel]
  );
  const quoteDisabled =
    !amount.trim() ||
    !wallet.trim() ||
    quoting ||
    (action === "swap"
      ? !selectedSourceAsset || !selectedTargetAsset || selectedSourceAsset.address === selectedTargetAsset.address
      : !selectedStock || !selectedPayToken);
  const tradePreview = useMemo(() => {
    if (action === "swap") {
      if (!selectedSourceAsset || !selectedTargetAsset) return null;
      return { source: selectedSourceAsset, target: selectedTargetAsset };
    }
    if (!selectedStock || !selectedPayToken) return null;
    const source = action === "sell" ? selectedStock : selectedPayToken;
    const target = action === "sell" ? selectedPayToken : selectedStock;
    return { source, target };
  }, [action, selectedPayToken, selectedSourceAsset, selectedStock, selectedTargetAsset]);

  async function prepareTrade() {
    if (!tradePreview) return;
    setQuoting(true);
    setTradeError("");
    setTradeResult(null);
    const slippagePercentage = Number(slippage);
    const payload = {
      action,
      source_asset: tradePreview.source.address,
      target_asset: tradePreview.target.address,
      amount,
      wallet_address: wallet,
      provider: "auto",
      slippagePercentage: Number.isFinite(slippagePercentage) ? slippagePercentage : 0.5,
      strategy: `Hermes ${action} rail from dashboard`
    };
    try {
      const res = await fetch("/api/robinhood/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setTradeResult(await res.json());
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : "Quote request failed");
    } finally {
      setQuoting(false);
    }
  }

  return (
    <>
      <div className="dither-background" aria-hidden="true">
        <Dither
          waveColor={[0.8, 1, 0]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.2}
          colorNum={4.9}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>
      <main className="shell" style={{ "--accent": selectedStock?.brandColor || "#2d6cdf" } as CSSProperties}>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <div className="eyebrow">Hermes Robinhood Chain</div>
          <h1 id="page-title">Stock-token command center</h1>
          <p>
            Review Hermes stock-token outputs, inspect every fetched data source, and prepare wallet-signed
            Robinhood Chain routes from the same API payloads.
          </p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" type="button" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing" : "Refresh data"}
          </button>
          {health?.robinhood_chain.explorer ? (
            <a className="button ghost" href={health.robinhood_chain.explorer} target="_blank" rel="noreferrer">
              Explorer
            </a>
          ) : null}
        </div>
      </section>

      <section className="readiness" aria-label="System readiness">
        <StatusDot
          label="Robinhood RPC"
          active={Boolean(chainStatus?.ok)}
          detail={chainStatus?.ok ? `block ${chainStatus.latestBlock || "live"}` : "env needed"}
        />
        <StatusDot
          label="Nuvolari"
          active={Boolean(health?.nuvolari_configured)}
          detail={health?.nuvolari_configured ? "quotes enabled" : "key needed"}
        />
        <StatusDot
          label="OpenRouter"
          active={Boolean(health?.openrouter_configured)}
          detail={health?.openrouter_configured ? health?.model || "configured" : "optional"}
        />
        <StatusDot
          label="Stock API"
          active={Boolean(stockCatalog?.ok)}
          detail={stockCatalog?.ok ? `${stockCatalog.stocks.length} stocks` : "loading"}
        />
        <div className="readiness-note">
          <span>Boundary</span>
          <strong>quotes only; wallet signs separately</strong>
        </div>
      </section>

      <div className="workspace">
        <section className="asset-rail" aria-labelledby="asset-title">
          <div className="section-head">
            <div>
              <div className="eyebrow">Stock universe</div>
              <h2 id="asset-title">Choose a rail</h2>
            </div>
            <span className="count">{stockUniverse.length} tokens</span>
          </div>

          <div className="stock-grid">
            {stockUniverse.map((stock) => {
              const recommendation = recommendationBySymbol.get(stock.symbol);
              const price = recommendation?.evidence.price_snapshot;
              return (
                <button
                  className={`stock-tile ${stock.symbol === selected ? "selected" : ""}`}
                  key={stock.symbol}
                  onClick={() => setSelected(stock.symbol)}
                  type="button"
                  style={{ "--brand": stock.brandColor || "#2d6cdf" } as CSSProperties}
                  aria-pressed={stock.symbol === selected}
                >
                  <Logo stock={stock} />
                  <span>
                    <strong>{stock.symbol}</strong>
                    <small>{stock.name}</small>
                  </span>
                  <span className="stock-price">
                    <strong>{formatPrice(price?.close)}</strong>
                    <small>{price?.date || "quote pending"}</small>
                  </span>
                  {recommendation ? (
                    <span className={`rec-chip ${recommendation.recommendation}`}>
                      {recommendation.label} <b>{recommendation.confidence}%</b>
                    </span>
                  ) : null}
                  <code>{shortAddress(stock.address)}</code>
                </button>
              );
            })}
          </div>
        </section>

        <section className="quote-panel" aria-labelledby="quote-title">
          <div className="quote-top">
            <div>
              <div className="eyebrow">Quote preparation</div>
              <h2 id="quote-title">{selected} route ticket</h2>
            </div>
            {selectedStock ? <Logo stock={selectedStock} size="large" /> : null}
          </div>

          <div className="segmented" aria-label="Trade action">
            <button className={action === "buy" ? "active" : ""} type="button" onClick={() => setAction("buy")}>
              Buy
            </button>
            <button className={action === "sell" ? "active" : ""} type="button" onClick={() => setAction("sell")}>
              Sell
            </button>
            <button className={action === "swap" ? "active" : ""} type="button" onClick={() => setAction("swap")}>
              Swap
            </button>
          </div>

          {action === "swap" ? (
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="source-asset">Source asset</label>
                <select id="source-asset" value={sourceAsset} onChange={(event) => setSourceAsset(event.target.value)}>
                  {allAssets.map((asset) => (
                    <option key={asset.address} value={asset.address}>
                      {asset.symbol} · {asset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="target-asset">Target asset</label>
                <select id="target-asset" value={targetAsset} onChange={(event) => setTargetAsset(event.target.value)}>
                  {allAssets.map((asset) => (
                    <option key={asset.address} value={asset.address}>
                      {asset.symbol} · {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="field-group">
              <label htmlFor="pay-token">{action === "buy" ? "Pay token" : "Receive token"}</label>
              <select id="pay-token" value={payToken} onChange={(event) => setPayToken(event.target.value)}>
                {paymentUniverse.map((token) => (
                  <option key={token.symbol}>{token.symbol}</option>
                ))}
              </select>
            </div>
          )}

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="amount">Base units</label>
              <input
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="field-group">
              <label htmlFor="slippage">Slippage %</label>
              <input
                id="slippage"
                inputMode="decimal"
                value={slippage}
                onChange={(event) => setSlippage(event.target.value)}
                placeholder="0.5"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="wallet">Wallet EOA</label>
            <input id="wallet" value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." />
          </div>

          {tradePreview ? (
            <div className="route-preview" aria-label="Prepared route preview">
              <div>
                <span>Source</span>
                <strong>{tradePreview.source.symbol}</strong>
                <code>{shortAddress(tradePreview.source.address)}</code>
              </div>
              <div className="route-arrow" aria-hidden="true" />
              <div>
                <span>Target</span>
                <strong>{tradePreview.target.symbol}</strong>
                <code>{shortAddress(tradePreview.target.address)}</code>
              </div>
            </div>
          ) : null}

          <button className="button primary" type="button" onClick={prepareTrade} disabled={quoteDisabled}>
            {quoting ? "Preparing quote" : "Prepare quote"}
          </button>

          {tradeError ? <p className="inline-error">{tradeError}</p> : null}
          {tradeResult ? <pre className="result">{JSON.stringify(tradeResult, null, 2)}</pre> : null}
        </section>
      </div>

      <section className="hermes-output-band" aria-label="Hermes output">
        <div className="context-panel hermes-output-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Hermes output</div>
              <h2>{hermesOutput?.hermes_decision?.verdict || intel?.hermes_decision.verdict || "Awaiting agent output"}</h2>
            </div>
            <span className="count">{health?.openrouter_configured ? "model" : "fallback"}</span>
          </div>
          {hermesOutputError ? <p className="inline-error">{hermesOutputError}</p> : null}
          <pre className="result hermes-output">{hermesOutput?.reply || "Refresh data to generate Hermes output."}</pre>
          <div className="tool-trace">
            {(hermesOutput?.tool_trace || []).map((tool) => (
              <span className={`trace-pill ${tool.ok ? "ok" : "degraded"}`} key={tool.name}>
                {tool.name.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="recommendation-band" aria-label="Hermes recommendations">
        <div className="context-panel recommendation-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Hermes verdict</div>
              <h2>{intel?.hermes_decision.verdict || `${selected} execution posture`}</h2>
            </div>
            {selectedRecommendation ? (
              <span className={`rec-chip ${selectedRecommendation.recommendation}`}>
                {selectedRecommendation.label} <b>{selectedRecommendation.confidence}%</b>
              </span>
            ) : null}
          </div>

          {selectedRecommendation ? (
            <div className="recommendation-detail">
              {intel?.hermes_decision.summary ? <p>{intel.hermes_decision.summary}</p> : null}
              <p>{selectedRecommendation.rationale}</p>
              <p className="action-line">{selectedRecommendation.user_action}</p>
              <div className="metric-grid">
                <div>
                  <span>Contract</span>
                  <strong>{shortAddress(selectedRecommendation.evidence.official_contract)}</strong>
                </div>
                <div>
                  <span>Kalshi matches</span>
                  <strong>{selectedRecommendation.evidence.kalshi_match_count}</strong>
                </div>
                <div>
                  <span>Calendar</span>
                  <strong>{selectedRecommendation.evidence.calendar_ok ? "returned" : "links only"}</strong>
                </div>
                <div>
                  <span>Explorer</span>
                  <strong>{selectedRecommendation.evidence.explorer_confirmed ? "confirmed" : "not confirmed"}</strong>
                </div>
              </div>
              <div className="metric-grid evidence-grid">
                <div>
                  <span>Public quote</span>
                  <strong>{formatPrice(selectedRecommendation.evidence.price_snapshot?.close)}</strong>
                </div>
                <div>
                  <span>Quote date</span>
                  <strong>{selectedRecommendation.evidence.price_snapshot?.date || "n/a"}</strong>
                </div>
                <div>
                  <span>Volume</span>
                  <strong>{formatVolume(selectedRecommendation.evidence.price_snapshot?.volume)}</strong>
                </div>
                <div>
                  <span>SEC filing</span>
                  <strong>{selectedRecommendation.evidence.latest_filing?.form || "n/a"}</strong>
                </div>
              </div>
              <div className="market-price-grid">
                <div>
                  <span>YES bid / ask</span>
                  <strong>
                    {selectedRecommendation.evidence.market_pricing?.yes_bid || "n/a"} /{" "}
                    {selectedRecommendation.evidence.market_pricing?.yes_ask || "n/a"}
                  </strong>
                </div>
                <div>
                  <span>NO bid / ask</span>
                  <strong>
                    {selectedRecommendation.evidence.market_pricing?.no_bid || "n/a"} /{" "}
                    {selectedRecommendation.evidence.market_pricing?.no_ask || "n/a"}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <strong>No recommendation returned</strong>
              <p>Refresh the pipeline to rebuild Hermes recommendations.</p>
            </div>
          )}
        </div>

        <div className="context-panel recommendation-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Per-stock output</div>
              <h2>All recommendations</h2>
            </div>
            <span className="count">{intel?.recommendations.length || 0} stocks</span>
          </div>
          <div className="recommendation-list">
            {intel?.recommendations.map((row) => (
              <button
                className={`recommendation-row ${row.symbol === selected ? "selected" : ""}`}
                key={row.symbol}
                type="button"
                onClick={() => setSelected(row.symbol)}
              >
                <strong>{row.symbol}</strong>
                <span>
                  {row.action}
                  <small>{formatPrice(row.evidence.price_snapshot?.close)}</small>
                </span>
                <b>{row.confidence}%</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="insight-grid" aria-label="Market and event context">
        <div className="context-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Market context</div>
              <h2>Public Kalshi matches</h2>
            </div>
            <span className="count">{selectedMarkets.length} found</span>
          </div>
          {intel?.kalshi.source_note ? <p className="source-note">{intel.kalshi.source_note}</p> : null}
          <div className="market-list">
            {selectedMarkets.length ? (
              selectedMarkets.map((market) => (
                <article className="market-row" key={market.ticker}>
                  <div className="market-main">
                    <strong>{market.ticker}</strong>
                    <p>{market.title || "Untitled market"}</p>
                  </div>
                  <div className="metric-grid">
                    <div>
                      <span>Yes bid</span>
                      <strong>{market.yes_bid_dollars || "n/a"}</strong>
                    </div>
                    <div>
                      <span>Yes ask</span>
                      <strong>{market.yes_ask_dollars || "n/a"}</strong>
                    </div>
                    <div>
                      <span>Liquidity</span>
                      <strong>{market.liquidity_dollars || "0"}</strong>
                    </div>
                    <div>
                      <span>Close</span>
                      <strong>{formatDate(market.close_time)}</strong>
                    </div>
                  </div>
                  <span className="score">score {market.score}</span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>No clean market match for {selected}</strong>
                <p>The public API feed was filtered locally, so noisy website search results are not promoted into a buy call.</p>
              </div>
            )}
          </div>
        </div>

        <div className="context-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Public events</div>
              <h2>{selected} calendar</h2>
            </div>
            <span className="count">{selectedCalendar?.ok ? "live" : "links"}</span>
          </div>

          <div className="calendar-stack">
            <div className="calendar-row">
              <span>Earnings</span>
              <strong>
                {selectedCalendar?.earnings_dates.length ? selectedCalendar.earnings_dates.map(formatDate).join(", ") : "not returned"}
              </strong>
            </div>
            <div className="calendar-row">
              <span>EPS average</span>
              <strong>{selectedCalendar?.estimates.earnings_average || "n/a"}</strong>
            </div>
            <div className="calendar-row">
              <span>Revenue average</span>
              <strong>{selectedCalendar?.estimates.revenue_average || "n/a"}</strong>
            </div>
            <div className="source-links">
              {selectedCalendar?.public_links.map((link) => (
                <a href={link} target="_blank" rel="noreferrer" key={link}>
                  {hostLabel(link)}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="context-panel explorer-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Explorer discovery</div>
              <h2>Stock-like contracts</h2>
            </div>
            <span className="count">{intel?.explorer_discovery?.other_count || 0} not routed</span>
          </div>

          <div className="discovery-note">
            <strong>Official docs stay the trading source of truth.</strong>
            <p>These are Blockscout-discovered ERC-20s that look stock-related, but Hermes will not quote them unless they match the official Robinhood contract list.</p>
          </div>

          <div className="discovery-list">
            {explorerOtherTokens.length ? (
              explorerOtherTokens.map((token) => (
                <a
                  className="discovery-row"
                  href={token.token_url}
                  target="_blank"
                  rel="noreferrer"
                  key={token.address}
                >
                  <div>
                    <strong>{token.symbol}</strong>
                    <span>{token.name}</span>
                  </div>
                  <div>
                    <span>{token.trust_level.replaceAll("_", " ")}</span>
                    <code>{shortAddress(token.address)}</code>
                  </div>
                </a>
              ))
            ) : (
              <div className="empty-state">
                <strong>No extra stock-like contracts returned</strong>
                <p>The official dictionary remains the complete routed universe.</p>
              </div>
            )}
          </div>
        </div>

        <div className="context-panel pipeline-panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Hermes intake</div>
              <h2>Fetched and passed data</h2>
            </div>
            <span className="count">{intel?.pipeline.ok ? "clean" : "degraded"}</span>
          </div>

          <div className="pipeline-checks">
            {intel?.pipeline.checks.map((check) => (
              <div className="pipeline-row" key={check.name}>
                <div>
                  <strong>{check.name.replaceAll("_", " ")}</strong>
                  <span>{check.source}</span>
                  {check.note ? <span>{check.note}</span> : null}
                </div>
                <div>
                  <span>{check.required ? "required" : "optional"}</span>
                  <b>{check.ok ? `${check.records} records` : check.error || "unavailable"}</b>
                </div>
              </div>
            ))}
          </div>

          <pre className="result intake-json">{JSON.stringify(intel?.agent_context || {}, null, 2)}</pre>
        </div>
      </section>
      </main>
    </>
  );
}
