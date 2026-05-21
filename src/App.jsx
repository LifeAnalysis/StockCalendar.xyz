"use client";

/* eslint-disable @next/next/no-img-element */
import * as React from "react";

const Dither = React.lazy(() => import("./Dither.jsx"));
const InteractiveStockChart = React.lazy(() =>
  import("./components/InteractiveStockChart.jsx").then((module) => ({ default: module.InteractiveStockChart }))
);

const fallbackStocks = [
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    logoText: "T",
    logoUrl: "/logos/tesla.svg",
    logoBg: "#f7eeee",
    logoFg: "#c9252d",
    score: 72,
    earnings: "TBD",
    chart: [18, 24, 21, 28, 35, 31, 42, 38, 45, 51],
    bullets: [
      "Track delivery, margin, and guidance language into the next report.",
      "Hermes should separate event risk from broad market beta before quote prep.",
      "A testnet buy should still state invalidation, target, and expected catalyst."
    ]
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    address: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    logoText: "a",
    logoUrl: "/logos/amazon.svg",
    logoBg: "#fff3d9",
    logoFg: "#111111",
    score: 66,
    earnings: "TBD",
    chart: [24, 20, 28, 31, 29, 35, 37, 42, 44, 48],
    bullets: [
      "Watch AWS growth, retail margin, and ad revenue contribution.",
      "Hermes should explain whether the earnings setup is catalyst-driven or valuation-driven.",
      "Use the trade ticket only after the expected move is clear."
    ]
  },
  {
    symbol: "PLTR",
    name: "Palantir",
    address: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    logoText: "P",
    logoUrl: "/logos/palantir.svg",
    logoBg: "#edf0f4",
    logoFg: "#20242a",
    score: 74,
    earnings: "TBD",
    chart: [14, 19, 27, 22, 36, 32, 44, 39, 52, 48],
    bullets: [
      "High narrative sensitivity makes pre-earnings discipline important.",
      "Hermes should call out valuation, guidance language, and AI demand signals.",
      "Use smaller testnet sizing assumptions until research confidence improves."
    ]
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    logoText: "N",
    logoUrl: "/logos/netflix.svg",
    logoBg: "#fae8e6",
    logoFg: "#e50914",
    score: 63,
    earnings: "TBD",
    chart: [31, 29, 32, 28, 34, 39, 36, 43, 41, 47],
    bullets: [
      "Watch subscriber growth, ad tier, and margin commentary.",
      "Hermes should compare event risk with recent price expectations.",
      "Trade ticket remains testnet-only until quote provider responds."
    ]
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    address: "0x71178BAc73cBeb415514eB542a8995b82669778d",
    logoText: "AMD",
    logoUrl: "/logos/amd.svg",
    logoBg: "#eef4ee",
    logoFg: "#0b6b3a",
    score: 70,
    earnings: "TBD",
    chart: [20, 26, 23, 34, 38, 33, 41, 49, 45, 56],
    bullets: [
      "Track data-center demand, margin guide, and Nvidia sympathy flows.",
      "Hermes should separate earnings catalyst from semiconductor index movement.",
      "Quote prep should stay explicit about token addresses and testnet chain."
    ]
  }
];

const fallbackPayTokens = [
  { symbol: "USDG", name: "USDG", address: "0x7E955252E15c84f5768B83c41a71F9eba181802F" },
  { symbol: "WETH", name: "Wrapped Ether", address: "0x7943e237c7F95DA44E0301572D358911207852Fa" }
];

function Logo({ stock }) {
  return (
    <span
      className={`logo ${stock.logoUrl ? "image-logo" : ""}`}
      role="img"
      aria-label={`${stock.name} logo`}
      style={{ "--logo-bg": stock.logoBg || "#fff", "--logo-fg": stock.logoFg || "#202621" }}
    >
      {stock.logoUrl ? <img src={stock.logoUrl} alt="" loading="lazy" /> : stock.logoText || stock.symbol.slice(0, 2)}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m16.5 16.5 4 4"></path>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14"></path>
      <path d="m19 12-7 7-7-7"></path>
    </svg>
  );
}

function TokenButton({ token, placeholder, onClick, accent }) {
  return (
    <button className={`swap-token-button ${accent ? "accent" : ""}`} type="button" onClick={onClick}>
      {token ? <Logo stock={token} /> : null}
      <span>{token ? token.symbol : placeholder}</span>
      <ChevronDownIcon />
    </button>
  );
}

function TokenPicker({ open, title, items, selectedSymbol, onSelect, onClose }) {
  const [query, setQuery] = React.useState("");
  const modalRef = React.useRef(null);

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll("button, input");
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = items.filter((item) => {
    const haystack = `${item.symbol} ${item.name} ${item.address}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="token-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={modalRef} className="token-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="token-modal-head">
          <h3>{title}</h3>
          <button className="icon-button" type="button" aria-label="Close token picker" onClick={onClose}>×</button>
        </div>
        <label className="token-search">
          <SearchIcon />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search token or paste address" autoFocus />
        </label>
        <div className="token-list" role="listbox" aria-label={title}>
          {filtered.map((item) => {
            const active = item.symbol === selectedSymbol;
            return (
              <button className={`token-row ${active ? "active" : ""}`} type="button" role="option" aria-selected={active} key={item.address || item.symbol} onClick={() => onSelect(item)}>
                <Logo stock={item} />
                <span className="token-row-main">
                  <strong>{item.name}</strong>
                  <span>{item.symbol}</span>
                </span>
                <span className={`token-change ${(item.score || 0) >= 68 ? "up" : ""}`}>{item.score ? `▲ ${(item.score / 100).toFixed(2)}%` : "0.00%"}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function stockChartData(stock, priceSnapshot) {
  const points = stock.chart || [10, 12, 11, 14, 15];
  const now = new Date();
  const liveClose = Number(priceSnapshot?.close);
  return points.map((value, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (points.length - index - 1) * 7);
    const drift = (index % 3) - 1;
    const close = index === points.length - 1 && Number.isFinite(liveClose) ? liveClose : value;
    return {
      date: date.toISOString(),
      open: close - 0.8 + drift * 0.2,
      high: close + 1.4 + drift * 0.3,
      low: Math.max(close - 1.6 + drift * 0.2, 0.1),
      close
    };
  });
}

function StockChartView({ data, ticker }) {
  return data?.length ? (
    <React.Suspense fallback={<div className="chart-fallback" />}>
      <InteractiveStockChart chartData={data} ticker={ticker} />
    </React.Suspense>
  ) : (
    <div className="chart-fallback" />
  );
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function HermesOutputBar({ stock, hermesOutput }) {
  const score = Math.max(0, Math.min(stock.score || 0, 100));
  const decision = hermesOutput?.hermes_decision?.stocks?.find((item) => item.symbol === stock.symbol);
  const stance = decision?.action || (score >= 72 ? "WATCH" : score >= 64 ? "WATCH" : "NO_BUY");
  return (
    <div className="cn-card score-card">
      <div className="cn-card-content">
        <div className="score-head">
          <div>
            <span className="text-muted-foreground text-sm">Hermes agent output</span>
            <strong>{decision ? `${decision.confidence}%` : `${score}/100`}</strong>
          </div>
          <span>{stance}</span>
        </div>
        <div className="score-meter" aria-label={`Hermes confidence ${decision?.confidence || score} out of 100`}>
          <div style={{ width: `${decision?.confidence || score}%` }}></div>
        </div>
        <div className="score-note">
          {decision?.reason || hermesOutput?.reply || `${stock.symbol} selected. Contract is ready for Robinhood testnet quote prep.`}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [selected, setSelected] = React.useState("TSLA");
  const [side, setSide] = React.useState("buy");
  const [stocks, setStocks] = React.useState(fallbackStocks);
  const [payTokens, setPayTokens] = React.useState(fallbackPayTokens);
  const [payTokenSymbol, setPayTokenSymbol] = React.useState("USDG");
  const [amount, setAmount] = React.useState("");
  const [wallet, setWallet] = React.useState("");
  const [tokenPicker, setTokenPicker] = React.useState(null);
  const [routePreview, setRoutePreview] = React.useState("Choose a supported stock to build a route preview.");
  const [backend, setBackend] = React.useState({ health: false, intel: false, trade: false });
  const [hermesOutput, setHermesOutput] = React.useState(null);
  const [charts, setCharts] = React.useState(() =>
    Object.fromEntries(
      fallbackStocks.map((item) => [item.symbol, stockChartData(item)])
    )
  );

  const stock = stocks.find((item) => item.symbol === selected);
  const payToken = payTokens.find((token) => token.symbol === payTokenSymbol) || payTokens[0];
  const sourceToken = side === "sell" ? stock : payToken;
  const targetToken = side === "sell" ? payToken : stock;
  const amountNumber = Number(amount || 0);
  const selectedScore = stock ? stock.score : 0;
  const estimatedOutput = stock && amountNumber > 0 ? (amountNumber / Math.max(stock.score, 1)).toFixed(6) : "0";
  const selectedChartData = stock ? charts[stock.symbol] || stockChartData(stock) : [];

  React.useEffect(() => {
    async function loadBackend() {
      const nextBackend = { health: false, intel: false, trade: false };
      try {
        const healthRes = await fetch("/api/health");
        const health = await readJsonResponse(healthRes);
        nextBackend.health = Boolean(health);
        if (health) {
          nextBackend.trade = Boolean(health.robinhood_chain && health.robinhood_chain.stock_trade_tool);
        }
      } catch (error) {
        console.warn("Health API unavailable", error);
      }

      try {
        const outputRes = await fetch("/api/hermes/output");
        const output = await readJsonResponse(outputRes);
        const intel = output?.data;
        if (output) setHermesOutput(output);
        if (intel) {
          const recommendations = new Map((intel.recommendations || []).map((item) => [item.symbol, item]));
          const prices = new Map((intel.stock_signals?.prices || []).map((item) => [item.symbol, item]));
          const loadedStocks = intel.robinhood_chain?.stocks || [];
          const loadedTokens = intel.robinhood_chain?.payment_tokens || [];
          if (loadedStocks.length) {
            const nextStocks = loadedStocks.map((item, index) => {
              const fallback = fallbackStocks.find((stock) => stock.symbol === item.symbol) || fallbackStocks[index % fallbackStocks.length];
              const recommendation = recommendations.get(item.symbol);
              const price = prices.get(item.symbol);
              return {
                ...fallback,
                ...item,
                logoText: fallback.logoText,
                logoUrl: fallback.logoUrl,
                logoBg: fallback.logoBg,
                logoFg: fallback.logoFg,
                score: recommendation?.confidence || fallback.score,
                chart: fallback.chart,
                bullets: [
                  recommendation?.reason,
                  recommendation?.next_step,
                  price?.ok && price.close ? `Public quote close ${price.close}${price.date ? ` on ${price.date}` : ""}.` : null
                ].filter(Boolean)
              };
            });
            setStocks(nextStocks);
            setCharts(Object.fromEntries(nextStocks.map((item) => [item.symbol, stockChartData(item, prices.get(item.symbol))])));
            nextBackend.intel = true;
          }
          if (loadedTokens.length) setPayTokens(loadedTokens);
        }
      } catch (error) {
        console.warn("Stock intel unavailable", error);
      }
      setBackend(nextBackend);
    }
    loadBackend();
  }, []);

  React.useEffect(() => {
    if (!stock || !payToken) {
      setRoutePreview("Choose a supported stock to build a route preview.");
      return;
    }
    setRoutePreview(`${side === "sell" ? stock.symbol : payToken.symbol} -> ${side === "sell" ? payToken.symbol : stock.symbol}. Robinhood Chain ${side} quote will use exact contracts on chain 46630.`);
  }, [stock, payToken, side]);

  function routePayload() {
    if (!stock || !payToken) return null;
    const isSell = side === "sell";
    return {
      action: side,
      source_asset: isSell ? stock.address : payToken.address,
      target_asset: isSell ? payToken.address : stock.address,
      amount: amount.trim(),
      wallet_address: wallet.trim(),
      provider: "auto",
      strategy: `Hermes Robinhood Chain ${side} route for ${stock.symbol}`
    };
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.warn("Clipboard copy failed", error);
    }
  }

  async function submitTrade(event) {
    event.preventDefault();
    const payload = routePayload();
    if (!payload) {
      setRoutePreview("Select a stock before preparing a quote.");
      return;
    }
    if (!payload.wallet_address || !payload.amount) {
      setRoutePreview("Enter wallet EOA and amount to prepare a Nuvolari quote.");
      return;
    }
    setRoutePreview("Preparing quote...");
    try {
      const res = await fetch("/api/robinhood/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const payload = await readJsonResponse(res);
      if (!res.ok || !payload) {
        setRoutePreview(`Quote request failed with status ${res.status}`);
        return;
      }
      setRoutePreview(JSON.stringify(payload));
    } catch (error) {
      setRoutePreview(`Quote request failed: ${error.message}`);
    }
  }

  function selectToken(kind, item) {
    if (kind === "stock") setSelected(item.symbol);
    if (kind === "pay") setPayTokenSymbol(item.symbol);
    setTokenPicker(null);
  }

  return (
    <>
      <div className="app-dither-background" aria-hidden="true">
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      </div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="ticker-carousel" aria-label="Supported stock carousel">
            <div className="ticker-track">
              {[...stocks, ...stocks].map((item, index) => {
                const duplicate = index >= stocks.length;
                return (
                  <button
                    className={`ticker-pill ${item.symbol === selected ? "active" : ""}`}
                    type="button"
                    key={`${item.symbol}-${index}`}
                    tabIndex={duplicate ? -1 : undefined}
                    aria-hidden={duplicate ? "true" : undefined}
                    onClick={() => setSelected(item.symbol)}
                  >
                    <Logo stock={item} />
                    <span><strong>{item.symbol}</strong><span>{item.name}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className={`workspace ${stock ? "revealed" : ""}`}>
        <section className="control-stack">
          <form className="panel trade-ticket" onSubmit={submitTrade}>
            <div className="swap-shell">
              <div className="swap-toolbar">
                <div className="swap-tabs" aria-label="Trade side">
                  <button className={side === "buy" ? "active" : ""} type="button" onClick={() => setSide("buy")}>Buy</button>
                  <button className={side === "sell" ? "active sell" : ""} type="button" onClick={() => setSide("sell")}>Sell</button>
                  <button className={side === "swap" ? "active" : ""} type="button" onClick={() => setSide("swap")}>Swap</button>
                </div>
              </div>

              <div className="swap-card">
                <div className="swap-leg">
                  <TokenButton
                    token={sourceToken}
                    placeholder={side === "sell" ? "Select stock" : "Select token"}
                    accent={side === "buy"}
                    onClick={() => setTokenPicker(side === "sell" ? "stock" : "pay")}
                  />
                  <label className="amount-entry">
                    <input inputMode="decimal" aria-label="Trade amount" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
                    <span>${amountNumber ? amountNumber.toLocaleString() : "0"}</span>
                  </label>
                </div>

                <button
                  className="swap-flip"
                  type="button"
                  aria-label="Switch buy and sell direction"
                  onClick={() => setSide((current) => (current === "buy" ? "sell" : "buy"))}
                >
                  <ArrowDownIcon />
                </button>

                <div className="swap-leg output">
                  <TokenButton
                    token={targetToken}
                    placeholder={side === "sell" ? "Select token" : "Select stock"}
                    onClick={() => setTokenPicker(side === "sell" ? "pay" : "stock")}
                  />
                  <div className="amount-entry readout" aria-label="Estimated output amount">
                    <strong>{stock && amountNumber ? estimatedOutput : "0"}</strong>
                    <span>${stock && amountNumber ? Math.max(amountNumber * selectedScore * 0.01, 0).toFixed(2) : "0"}</span>
                  </div>
                </div>
              </div>

              <div className="wallet-route-stack">
                <label className="wallet-row">
                  <span>Wallet EOA</span>
                  <input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." />
                </label>
                <div className="route-row">
                  <span>Route</span>
                  <p>{routePreview}</p>
                </div>
              </div>

              <button className="swap-submit" type="submit">
                {wallet.trim() ? "Prepare quote" : "Connect wallet"}
              </button>
            </div>
          </form>

          <section className="panel stock-section">
            <div className="stocks-grid">
              {stocks.map((item) => (
                <article className={`stock-card ${item.symbol === selected ? "active" : ""}`} key={item.symbol}>
                  <button className="stock-select" type="button" onClick={() => setSelected(item.symbol)}>
                    <div className="stock-top">
                      <Logo stock={item} />
                      <div className="ticker">{item.symbol}</div>
                    </div>
                  </button>
                  <div className="contract-row">
                    <button className="copy-btn" type="button" aria-label={`Copy ${item.symbol} contract`} onClick={() => copy(item.address)}>
                      <span className="copy-icon"></span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        {stock && (
          <section className="panel research-panel" aria-label="Selected stock research">
              <div className="research-heading">
              <div className="research-title">
                <Logo stock={stock} />
                <div>
                  <h2>{stock.symbol}</h2>
                  <div className="company">{stock.name}</div>
                </div>
              </div>
              </div>
            <div className="detail-stack">
              <StockChartView data={selectedChartData} ticker={stock.symbol} />
              <HermesOutputBar stock={stock} hermesOutput={hermesOutput} />
              <div className="cn-card">
                <div className="cn-card-content flex flex-col gap-3">
                  <span className="font-medium">Research brief</span>
                  <ul className="research-list">{(stock.bullets || []).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <TokenPicker
        open={tokenPicker === "stock"}
        title={side === "sell" ? "Sell token" : "Buy token"}
        items={stocks}
        selectedSymbol={stock ? stock.symbol : ""}
        onSelect={(item) => selectToken("stock", item)}
        onClose={() => setTokenPicker(null)}
      />
      <TokenPicker
        open={tokenPicker === "pay"}
        title={side === "sell" ? "Receive token" : "Pay token"}
        items={payTokens.map((token, index) => ({
          logoText: token.symbol.slice(0, 2),
          logoBg: index === 0 ? "#f0fff4" : "#edf0ff",
          logoFg: index === 0 ? "#08763d" : "#343cff",
          score: index === 0 ? 0 : 23,
          ...token
        }))}
        selectedSymbol={payToken ? payToken.symbol : ""}
        onSelect={(item) => selectToken("pay", item)}
        onClose={() => setTokenPicker(null)}
      />
    </>
  );
}

export default App;
