"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Stock = {
  symbol: string;
  name: string;
  address: string;
  aliases: string[];
  logoUrl?: string;
  brandColor?: string;
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
    checks: Array<{ name: string; ok: boolean; required: boolean; source: string; records: number; error?: string }>;
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
    scanned_markets: number;
    stocks: Array<{ stock: Stock; match_count: number; markets: Market[] }>;
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

const shortAddress = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

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
  const [intel, setIntel] = useState<Intel | null>(null);
  const [selected, setSelected] = useState("TSLA");
  const [payToken, setPayToken] = useState("USDG");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [tradeResult, setTradeResult] = useState<unknown>(null);
  const [tradeError, setTradeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [healthRes, intelRes] = await Promise.all([fetch("/api/health"), fetch("/api/robinhood/intel")]);
      const nextHealth = (await healthRes.json()) as Health;
      const nextIntel = (await intelRes.json()) as Intel;
      setHealth(nextHealth);
      setIntel(nextIntel);
      if (!nextIntel.robinhood_chain.stocks.some((stock) => stock.symbol === selected)) {
        setSelected(nextIntel.robinhood_chain.stocks[0]?.symbol || "TSLA");
      }
      if (!nextIntel.robinhood_chain.payment_tokens.some((token) => token.symbol === payToken)) {
        setPayToken(nextIntel.robinhood_chain.payment_tokens[0]?.symbol || "USDG");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStock = useMemo(
    () => intel?.robinhood_chain.stocks.find((stock) => stock.symbol === selected),
    [intel, selected]
  );
  const selectedPayToken = useMemo(
    () => intel?.robinhood_chain.payment_tokens.find((token) => token.symbol === payToken),
    [intel, payToken]
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
  const quoteDisabled = !selectedStock || !selectedPayToken || !amount.trim() || !wallet.trim() || quoting;
  const tradePreview = useMemo(() => {
    if (!selectedStock || !selectedPayToken) return null;
    const source = action === "sell" ? selectedStock : selectedPayToken;
    const target = action === "sell" ? selectedPayToken : selectedStock;
    return { source, target };
  }, [action, selectedPayToken, selectedStock]);

  async function prepareTrade() {
    if (!selectedStock || !selectedPayToken) return;
    setQuoting(true);
    setTradeError("");
    setTradeResult(null);
    const isSell = action === "sell";
    const payload = {
      action,
      source_asset: isSell ? selectedStock.address : selectedPayToken.address,
      target_asset: isSell ? selectedPayToken.address : selectedStock.address,
      amount,
      wallet_address: wallet,
      provider: "auto",
      strategy: `Hermes stock rail from ${selected} dashboard`
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
    <main className="shell" style={{ "--accent": selectedStock?.brandColor || "#2d6cdf" } as CSSProperties}>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <div className="eyebrow">Hermes Robinhood Chain</div>
          <h1 id="page-title">Stock-token command center</h1>
          <p>
            Prepare wallet-signed stock-token routes, inspect the active token universe, and compare each symbol against
            Kalshi and calendar context.
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
          active={Boolean(health?.robinhood_chain.rpc_configured)}
          detail={health?.robinhood_chain.rpc_configured ? `chain ${health.robinhood_chain.chainId}` : "env needed"}
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
            <span className="count">{intel?.robinhood_chain.stocks.length || 0} tokens</span>
          </div>

          <div className="stock-grid">
            {intel?.robinhood_chain.stocks.map((stock) => {
              const recommendation = recommendationBySymbol.get(stock.symbol);
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
          </div>

          <div className="field-group">
            <label htmlFor="pay-token">Pay or receive token</label>
            <select id="pay-token" value={payToken} onChange={(event) => setPayToken(event.target.value)}>
              {intel?.robinhood_chain.payment_tokens.map((token) => (
                <option key={token.symbol}>{token.symbol}</option>
              ))}
            </select>
          </div>

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
              <label htmlFor="wallet">Wallet EOA</label>
              <input id="wallet" value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." />
            </div>
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
                <span>{row.action}</span>
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
              <h2>Kalshi matches</h2>
            </div>
            <span className="count">{selectedMarkets.length} found</span>
          </div>
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
                <p>The matcher is avoiding weak sports, politics, and noisy cross-asset hits.</p>
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
  );
}
