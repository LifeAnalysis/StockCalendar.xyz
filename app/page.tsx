"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  symbol: string;
  name: string;
  address: string;
  aliases: string[];
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

type Intel = {
  ok: boolean;
  timestamp: string;
  robinhood_chain: {
    stocks: Stock[];
    payment_tokens: Stock[];
    source: string;
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
};

type Health = {
  runtime: string;
  openrouter_configured: boolean;
  robinhood_chain: { rpc_configured: boolean; chainId: number; explorer: string };
  providers: { nuvolari: boolean; arqsy: boolean };
};

const shortAddress = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`;

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null);
  const [intel, setIntel] = useState<Intel | null>(null);
  const [selected, setSelected] = useState("TSLA");
  const [payToken, setPayToken] = useState("USDG");
  const [action, setAction] = useState("buy");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [tradeResult, setTradeResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [healthRes, intelRes] = await Promise.all([fetch("/api/health"), fetch("/api/robinhood/intel")]);
      setHealth(await healthRes.json());
      setIntel(await intelRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const selectedStock = useMemo(() => intel?.robinhood_chain.stocks.find((stock) => stock.symbol === selected), [intel, selected]);
  const selectedPayToken = useMemo(() => intel?.robinhood_chain.payment_tokens.find((token) => token.symbol === payToken), [intel, payToken]);
  const selectedMarkets = useMemo(() => intel?.kalshi.stocks.find((row) => row.stock.symbol === selected)?.markets || [], [intel, selected]);
  const selectedCalendar = useMemo(() => intel?.calendars.find((row) => row.symbol === selected), [intel, selected]);

  async function prepareTrade() {
    if (!selectedStock || !selectedPayToken) return;
    const isSell = action === "sell";
    const payload = {
      action: action as "buy" | "sell" | "swap" | "rotate",
      source_asset: isSell ? selectedStock.address : selectedPayToken.address,
      target_asset: isSell ? selectedPayToken.address : selectedStock.address,
      amount,
      wallet_address: wallet,
      provider: "auto",
      strategy: `Hermes stock rail from ${selected} dashboard`
    };
    const res = await fetch("/api/robinhood/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setTradeResult(JSON.stringify(await res.json(), null, 2));
  }

  return (
    <div className="page">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">HN</div>
          <div>
            <div className="kicker">Hermes x Nuvolari</div>
            <h1>Robinhood Chain</h1>
          </div>
          <p className="lede">
            Stock token universe, Kalshi market context, public event links, and atomic trade preparation in one Next.js surface.
          </p>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Readiness</div>
            <span className="tiny">{health?.runtime || "nextjs"}</span>
          </div>
          <div className="status">
            <div className={`pill ${health?.openrouter_configured ? "ok" : ""}`}>OpenRouter {health?.openrouter_configured ? "configured" : "missing"}</div>
            <div className={`pill ${health?.robinhood_chain.rpc_configured ? "ok" : ""}`}>
              Robinhood RPC {health?.robinhood_chain.rpc_configured ? `set: ${health.robinhood_chain.chainId}` : "needed"}
            </div>
            <div className={`pill ${health?.providers.nuvolari ? "ok" : ""}`}>Nuvolari {health?.providers.nuvolari ? "ready" : "missing"}</div>
            <div className={`pill ${health?.providers.arqsy ? "ok" : ""}`}>Arqsy {health?.providers.arqsy ? "configured" : "optional"}</div>
          </div>
        </section>

        <section className="trade-box">
          <div>
            <div className="label">Atomic trade</div>
            <h2>Prepare stock route</h2>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Action</label>
              <select value={action} onChange={(event) => setAction(event.target.value)}>
                <option value="buy">Buy stock</option>
                <option value="sell">Sell stock</option>
              </select>
            </div>
            <div className="field">
              <label>Stock</label>
              <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                {intel?.robinhood_chain.stocks.map((stock) => <option key={stock.symbol}>{stock.symbol}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pay / Receive</label>
              <select value={payToken} onChange={(event) => setPayToken(event.target.value)}>
                {intel?.robinhood_chain.payment_tokens.map((token) => <option key={token.symbol}>{token.symbol}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Base units</label>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1000000" />
            </div>
            <div className="field wide">
              <label>Wallet EOA</label>
              <input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." />
            </div>
          </div>
          <button className="btn primary" type="button" onClick={prepareTrade}>Prepare quote</button>
          {tradeResult ? <pre className="result">{tradeResult}</pre> : null}
        </section>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="kicker">Stock intelligence</div>
            <h1>{selected} workspace</h1>
            <p className="lede">
              {intel ? `${intel.robinhood_chain.stocks.length} stock tokens, ${intel.kalshi.scanned_markets} Kalshi markets scanned.` : "Loading live context."}
            </p>
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={refresh}>{loading ? "Refreshing" : "Refresh"}</button>
            {health?.robinhood_chain.explorer ? <a className="btn" href={health.robinhood_chain.explorer} target="_blank" rel="noreferrer">Explorer</a> : null}
          </div>
        </div>

        <div className="grid">
          <section className="section">
            <div className="section-head">
              <h2>Robinhood stock dictionary</h2>
              <span className="badge">Official docs</span>
            </div>
            <div className="stock-list">
              {intel?.robinhood_chain.stocks.map((stock) => (
                <button className="stock-row" key={stock.symbol} onClick={() => setSelected(stock.symbol)}>
                  <div className="stock-top">
                    <div>
                      <div className="symbol">{stock.symbol}</div>
                      <div className="meta">{stock.name}</div>
                    </div>
                    <span className="badge">{stock.symbol === selected ? "selected" : "stock"}</span>
                  </div>
                  <div className="addr">{shortAddress(stock.address)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Calendar</h2>
              <span className="badge">{selectedCalendar?.ok ? "live" : "links"}</span>
            </div>
            <div className="event-list">
              <article className="event-row">
                <div className="symbol">{selected}</div>
                <p className="meta">Earnings: {selectedCalendar?.earnings_dates.length ? selectedCalendar.earnings_dates.join(", ") : "not returned by public feed"}</p>
                <p className="meta">EPS avg: {selectedCalendar?.estimates.earnings_average || "n/a"} · Revenue avg: {selectedCalendar?.estimates.revenue_average || "n/a"}</p>
                <div className="actions">
                  {selectedCalendar?.public_links.map((link) => <a className="btn" href={link} target="_blank" rel="noreferrer" key={link}>Open</a>)}
                </div>
              </article>
            </div>
          </section>
        </div>

        <section className="section">
          <div className="section-head">
            <h2>Kalshi linked markets</h2>
            <span className="badge">{selectedMarkets.length} matches</span>
          </div>
          <div className="market-list">
            {selectedMarkets.length ? selectedMarkets.map((market) => (
              <article className="market-row" key={market.ticker}>
                <div className="market-top">
                  <div>
                    <div className="symbol">{market.ticker}</div>
                    <p className="meta">{market.title}</p>
                  </div>
                  <span className="badge">score {market.score}</span>
                </div>
                <div className="price-grid">
                  <div className="price-cell"><span>Yes bid</span><strong>{market.yes_bid_dollars || "n/a"}</strong></div>
                  <div className="price-cell"><span>Yes ask</span><strong>{market.yes_ask_dollars || "n/a"}</strong></div>
                  <div className="price-cell"><span>Liquidity</span><strong>{market.liquidity_dollars || "0"}</strong></div>
                  <div className="price-cell"><span>Close</span><strong>{market.close_time ? new Date(market.close_time).toLocaleDateString() : "n/a"}</strong></div>
                </div>
              </article>
            )) : <article className="market-row"><p className="meta">No strong Kalshi matches found for {selected}. The matcher keeps weak/noisy sports and politics hits out.</p></article>}
          </div>
        </section>
      </main>
    </div>
  );
}
