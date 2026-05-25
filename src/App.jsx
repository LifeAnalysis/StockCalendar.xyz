"use client";

/* eslint-disable @next/next/no-img-element */
import * as React from "react";

const Dither = React.lazy(() => import("./Dither.jsx"));
const InteractiveStockChart = React.lazy(() =>
  import("./components/InteractiveStockChart.jsx").then((module) => ({ default: module.InteractiveStockChart }))
);

const stockPresentation = [
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    logoText: "T",
    logoUrl: "/logos/tesla.svg",
    logoBg: "#f7eeee",
    logoFg: "#c9252d",
    score: 0
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    address: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    logoText: "a",
    logoUrl: "/logos/amazon.svg",
    logoBg: "#fff3d9",
    logoFg: "#111111",
    score: 0
  },
  {
    symbol: "PLTR",
    name: "Palantir",
    address: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    logoText: "P",
    logoUrl: "/logos/palantir.svg",
    logoBg: "#edf0f4",
    logoFg: "#20242a",
    score: 0
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    logoText: "N",
    logoUrl: "/logos/netflix.svg",
    logoBg: "#fae8e6",
    logoFg: "#e50914",
    score: 0
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    address: "0x71178BAc73cBeb415514eB542a8995b82669778d",
    logoText: "AMD",
    logoUrl: "/logos/amd.svg",
    logoBg: "#eef4ee",
    logoFg: "#0b6b3a",
    score: 0
  }
];

const chartRanges = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" }
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

function shortAddress(value) {
  if (!value || typeof value !== "string") return "n/a";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "n/a";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: number >= 100 ? 2 : 4
  }).format(number);
}

function formatCompact(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "n/a";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
}

function formatDate(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function hostLabel(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
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

function DetailMetric({ label, value, tone }) {
  return (
    <div className={`detail-metric ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value || "n/a"}</strong>
    </div>
  );
}

function StatusPill({ label, ok, detail }) {
  return (
    <span className={`status-pill ${ok ? "ok" : "degraded"}`}>
      <b>{label}</b>
      <span>{detail || (ok ? "ok" : "degraded")}</span>
    </span>
  );
}

function kalshiPricingText(pricing) {
  if (!pricing) return null;
  const yes = pricing.yes_bid || pricing.yes_ask ? `YES ${pricing.yes_bid || "n/a"} / ${pricing.yes_ask || "n/a"}` : null;
  const no = pricing.no_bid || pricing.no_ask ? `NO ${pricing.no_bid || "n/a"} / ${pricing.no_ask || "n/a"}` : null;
  return [yes, no].filter(Boolean).join("; ");
}

function buildEvidenceItems({ stock, recommendation, price, filing, markets, calendar, news, officialExplorer }) {
  const evidence = recommendation?.evidence || {};
  const priceSnapshot = evidence.price_snapshot || (price?.ok ? price : null);
  const latestFiling = evidence.latest_filing || filing?.latest_material;
  const marketPricing = evidence.market_pricing;
  const topMarket = evidence.top_kalshi_market || markets?.[0];
  const kalshiCount = evidence.kalshi_match_count ?? markets?.length ?? 0;
  const newsCount = evidence.news_count ?? news?.article_count ?? 0;
  const earningsDates = evidence.earnings_dates?.length ? evidence.earnings_dates : calendar?.earnings_dates || [];

  return [
    {
      label: "Route",
      value: `${evidence.explorer_confirmed || officialExplorer ? "Official route confirmed" : "Official route listed"}: ${shortAddress(evidence.official_contract || stock.address)}`
    },
    priceSnapshot?.close
      ? {
          label: "Price",
          value: `${formatMoney(priceSnapshot.close)} close${priceSnapshot.date ? ` on ${formatDate(priceSnapshot.date)}` : ""}${priceSnapshot.volume ? `, ${formatCompact(priceSnapshot.volume)} volume` : ""}`
        }
      : null,
    latestFiling
      ? {
          label: "SEC",
          value: `${latestFiling.form || "Filing"}${latestFiling.filing_date ? ` filed ${formatDate(latestFiling.filing_date)}` : ""}`
        }
      : null,
    kalshiCount
      ? {
          label: "Kalshi",
          value: `${kalshiCount} matching market${kalshiCount === 1 ? "" : "s"}${kalshiPricingText(marketPricing) ? `; ${kalshiPricingText(marketPricing)}` : topMarket?.ticker ? `; top market ${topMarket.ticker}` : ""}`
        }
      : null,
    earningsDates.length
      ? {
          label: "Calendar",
          value: `Earnings watch: ${earningsDates.slice(0, 2).map(formatDate).join(", ")}`
        }
      : null,
    newsCount
      ? {
          label: "News",
          value: `${newsCount} recent article${newsCount === 1 ? "" : "s"} returned`
        }
      : null
  ].filter(Boolean);
}

function buildHermesDecisionSummary({ stock, recommendation, decision }) {
  const sourceDecision = recommendation || {
    action: decision?.action || "NO_BUY",
    confidence: decision?.confidence ?? 0,
    rationale: decision?.reason || "No explicit Hermes rationale is available yet.",
    user_action: "Refresh intel in a few seconds and try again."
  };

  const action = sourceDecision.action;
  const confidence = sourceDecision.confidence || 0;
  const reason = sourceDecision.rationale || sourceDecision.user_action || "No actionable signal yet.";
  const nextStep = sourceDecision.user_action || "Keep the setup visible and monitor source updates.";

  return {
    title: `${stock.symbol} ${action} (${typeof confidence === "number" ? `${confidence}%` : confidence})`,
    decision: recommendation ? "actionable" : "pending",
    reason: `${reason}.`,
    nextStep: nextStep
  };
}

function EvidenceSummary({ items }) {
  if (!items.length) return <p className="detail-copy">Hermes has not returned stock-specific evidence yet.</p>;
  return (
    <div className="evidence-list">
      {items.map((item) => (
        <div className="evidence-item" key={`${item.label}-${item.value}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function QuoteReceipt({ quote }) {
  if (!quote) return null;
  const ok = quote.ok !== false && !quote.error && !quote.needs_configuration;
  const request = quote.intended_request || quote.request || quote.payload || {};
  return (
    <div className="quote-receipt" aria-live="polite">
      <div className="quote-receipt-head">
        <span>Quote receipt</span>
        <strong>{ok ? "Ready" : quote.needs_configuration ? "Config needed" : "Review"}</strong>
      </div>
      <div className="receipt-grid">
        <DetailMetric label="Provider" value={quote.provider || quote.route?.provider || "auto"} />
        <DetailMetric label="Action" value={quote.action || request.action} />
        <DetailMetric label="Amount" value={quote.amount || request.amount} />
        <DetailMetric label="Status" value={quote.needs_configuration || quote.error || quote.status || (ok ? "prepared" : "returned")} />
      </div>
    </div>
  );
}

function ChartRangeControl({ range, onRangeChange }) {
  return (
    <div className="chart-range-control" aria-label="Chart range">
      {chartRanges.map((item) => (
        <button
          key={item.value}
          className={range === item.value ? "active" : ""}
          type="button"
          onClick={() => onRangeChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function StockChartView({ data, ticker, status, range, onRangeChange }) {
  return (
    <div className="chart-shell">
      <ChartRangeControl range={range} onRangeChange={onRangeChange} />
      {data?.length ? (
        <React.Suspense fallback={<div className="chart-fallback" />}>
          <InteractiveStockChart chartData={data} ticker={ticker} range={range} />
        </React.Suspense>
      ) : (
        <div className="chart-fallback chart-state">
          {status === "loading" ? "Loading Yahoo chart..." : "Chart unavailable from Yahoo."}
        </div>
      )}
    </div>
  );
}

function ResearchTabs({ stock, hermesOutput, activeTab, setActiveTab, backend }) {
  const intel = hermesOutput?.data;
  const recommendation = intel?.recommendations?.find((item) => item.symbol === stock.symbol);
  const markets = intel?.kalshi?.stocks?.find((item) => item.stock?.symbol === stock.symbol)?.markets || [];
  const calendar = intel?.calendars?.find((item) => item.symbol === stock.symbol);
  const price = intel?.stock_signals?.prices?.find((item) => item.symbol === stock.symbol);
  const filing = intel?.stock_signals?.filings?.find((item) => item.symbol === stock.symbol);
  const news = intel?.stock_signals?.news?.find((item) => item.symbol === stock.symbol);
  const officialExplorer = intel?.explorer_discovery?.tokens?.find(
    (token) => token.routed_by_agent && token.address?.toLowerCase() === stock.address?.toLowerCase()
  );
  const visibleChecks = intel?.pipeline?.checks || [];
  const evidenceItems = buildEvidenceItems({ stock, recommendation, price, filing, markets, calendar, news, officialExplorer });
  const hermesSummary = buildHermesDecisionSummary({
    stock,
    recommendation,
    decision: hermesOutput?.hermes_decision?.stocks?.find((item) => item.symbol === stock.symbol)
  });
  const degradedChecks = visibleChecks.filter((check) => !check.ok).length;
  const healthyChecks = visibleChecks.filter((check) => check.ok).length;
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "markets", label: "Markets", count: markets.length },
    { id: "signals", label: "Signals" }
  ];

  return (
    <div className="cn-card insight-card">
      <div className="insight-tabs" role="tablist" aria-label={`${stock.symbol} research details`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {typeof tab.count === "number" ? <span>{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="insight-body">
        {activeTab === "overview" ? (
          <div className="insight-section">
            <div className="detail-grid">
              <DetailMetric label="Action" value={recommendation?.action || hermesOutput?.hermes_decision?.stocks?.find((item) => item.symbol === stock.symbol)?.action || "n/a"} />
              <DetailMetric label="Confidence" value={recommendation ? `${recommendation.confidence}%` : stock.score ? `${stock.score}/100` : "n/a"} />
              <DetailMetric label="Readiness" value={hermesSummary.decision === "actionable" ? "Ready for quote prep" : "Needs cleaner data"} />
              <DetailMetric label="Explorer" value={recommendation?.evidence?.explorer_confirmed || officialExplorer ? "confirmed" : "not confirmed"} />
            </div>
            <EvidenceSummary items={evidenceItems} />
            <p className="detail-action">{hermesSummary.reason}</p>
            <div className="source-note">Next step: {hermesSummary.nextStep}</div>
            <div className="source-links compact-links">
              <button type="button" onClick={() => navigator.clipboard?.writeText(stock.address)}>
                Copy contract
              </button>
              {officialExplorer?.token_url ? (
                <a href={officialExplorer.token_url} target="_blank" rel="noreferrer">
                  Explorer
                </a>
              ) : null}
            </div>
            <div className="source-health-stack">
              <div className="status-strip">
                <StatusPill label="Health" ok={backend.health} detail={backend.health ? "live" : "missing"} />
                <StatusPill label="Intel" ok={backend.intel} detail={backend.intel ? "loaded" : "fallback"} />
                <StatusPill label="Trade" ok={backend.trade} detail={backend.trade ? "route ready" : "not ready"} />
                <StatusPill label="Pipeline" ok={Boolean(intel?.pipeline?.ok)} detail={intel?.pipeline?.ok ? "clean" : "degraded"} />
              </div>
              <p className="detail-copy">
                {visibleChecks.length
                  ? `${degradedChecks || "No"} degraded checks. ${healthyChecks} checks are healthy.`
                  : "Source health is loading."}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === "markets" ? (
          <div className="insight-section">
            {intel?.kalshi?.source_note ? <p className="source-note">{intel.kalshi.source_note}</p> : null}
            <div className="market-stack">
              {markets.length ? (
                markets.slice(0, 4).map((market) => (
                  <article className="market-item" key={market.ticker}>
                    <div>
                      <strong>{market.ticker}</strong>
                      <p>{market.title || "Untitled Kalshi market"}</p>
                    </div>
                    <div className="detail-grid">
                      <DetailMetric label="YES bid" value={market.yes_bid_dollars || "n/a"} />
                      <DetailMetric label="YES ask" value={market.yes_ask_dollars || "n/a"} />
                      <DetailMetric label="Liquidity" value={market.liquidity_dollars || "0"} />
                      <DetailMetric label="Close" value={formatDate(market.close_time)} />
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-compact">No clean Kalshi market match for {stock.symbol}.</div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "signals" ? (
          <div className="insight-section">
            <div className="detail-grid">
              <DetailMetric label="Public quote" value={price?.ok ? formatMoney(price.close) : "unavailable"} />
              <DetailMetric label="Quote date" value={price?.date || "n/a"} />
              <DetailMetric label="Volume" value={price?.volume ? formatCompact(price.volume) : "n/a"} />
              <DetailMetric label="SEC filing" value={filing?.latest_material?.form || recommendation?.evidence?.latest_filing?.form || "n/a"} />
              <DetailMetric label="Earnings" value={calendar?.earnings_dates?.length ? calendar.earnings_dates.map(formatDate).join(", ") : "not returned"} />
              <DetailMetric label="News" value={news?.article_count ? `${news.article_count} articles` : "none"} />
            </div>
            <div className="source-links compact-links">
              {filing?.latest_material?.document_url ? (
                <a href={filing.latest_material.document_url} target="_blank" rel="noreferrer">
                  SEC filing
                </a>
              ) : null}
              {(calendar?.public_links || []).slice(0, 2).map((link) => (
                <a href={link} target="_blank" rel="noreferrer" key={link}>
                  {hostLabel(link)}
                </a>
              ))}
              {(news?.top_articles || []).slice(0, 2).map((article) => (
                <a href={article.url} target="_blank" rel="noreferrer" key={article.url || article.title}>
                  {article.domain || "news"}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
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

function decorateStock(item, index, recommendation, price) {
  const presentation = stockPresentation.find((stock) => stock.symbol === item.symbol) || stockPresentation[index % stockPresentation.length] || {};
  const evidence = recommendation?.evidence || {};
  const pricingText = kalshiPricingText(evidence.market_pricing);
  return {
    ...item,
    logoText: presentation.logoText || item.symbol.slice(0, 2),
    logoUrl: presentation.logoUrl || item.logoUrl,
    logoBg: presentation.logoBg || "#fff",
    logoFg: presentation.logoFg || "#202621",
    score: recommendation?.confidence || 0,
    bullets: [
      recommendation ? `${recommendation.action} setup at ${recommendation.confidence}% confidence.` : null,
      evidence.official_contract ? `Route uses official contract ${shortAddress(evidence.official_contract)} on Robinhood Chain.` : null,
      price?.ok && price.close ? `Price: ${formatMoney(price.close)} close${price.date ? ` on ${formatDate(price.date)}` : ""}${price.volume ? `, ${formatCompact(price.volume)} volume` : ""}.` : null,
      evidence.latest_filing ? `SEC: ${evidence.latest_filing.form}${evidence.latest_filing.filing_date ? ` filed ${formatDate(evidence.latest_filing.filing_date)}` : ""}.` : null,
      evidence.kalshi_match_count ? `Kalshi: ${evidence.kalshi_match_count} matching market${evidence.kalshi_match_count === 1 ? "" : "s"}${pricingText ? `; ${pricingText}` : ""}.` : null,
      recommendation?.user_action || null
    ].filter(Boolean)
  };
}

function HermesOutputBar({ stock, hermesOutput }) {
  const score = Math.max(0, Math.min(stock.score || 0, 100));
  const decision = hermesOutput?.hermes_decision?.stocks?.find((item) => item.symbol === stock.symbol);
  const recommendation = hermesOutput?.data?.recommendations?.find((item) => item.symbol === stock.symbol);
  const hermesSummary = buildHermesDecisionSummary({ stock, recommendation, decision });
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
          {hermesSummary ? `${hermesSummary.title} · ${hermesSummary.reason} Next: ${hermesSummary.nextStep}` : `Contract is ready for Robinhood testnet quote prep.`}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [selected, setSelected] = React.useState("TSLA");
  const [side, setSide] = React.useState("buy");
  const [stocks, setStocks] = React.useState([]);
  const [payTokens, setPayTokens] = React.useState([]);
  const [payTokenSymbol, setPayTokenSymbol] = React.useState("USDG");
  const [amount, setAmount] = React.useState("");
  const [wallet, setWallet] = React.useState("");
  const [tokenPicker, setTokenPicker] = React.useState(null);
  const [routePreview, setRoutePreview] = React.useState("Choose a supported stock to build a route preview.");
  const [backend, setBackend] = React.useState({ health: false, intel: false, trade: false });
  const [hermesOutput, setHermesOutput] = React.useState(null);
  const [charts, setCharts] = React.useState({});
  const [chartStatus, setChartStatus] = React.useState("idle");
  const [chartRange, setChartRange] = React.useState("3mo");
  const [quoteResult, setQuoteResult] = React.useState(null);
  const [activeInsightTab, setActiveInsightTab] = React.useState("overview");

  const stock = stocks.find((item) => item.symbol === selected);
  const payToken = payTokens.find((token) => token.symbol === payTokenSymbol) || payTokens[0];
  const sourceToken = side === "sell" ? stock : payToken;
  const targetToken = side === "sell" ? payToken : stock;
  const amountNumber = Number(amount || 0);
  const selectedScore = stock ? stock.score : 0;
  const estimatedOutput = stock && amountNumber > 0 ? (amountNumber / Math.max(stock.score, 1)).toFixed(6) : "0";
  const selectedChartData = stock ? charts[stock.symbol] || [] : [];

  const loadYahooCharts = React.useCallback(async (symbols, range) => {
    if (!symbols.length) {
      setCharts({});
      setChartStatus("idle");
      return;
    }
    setChartStatus("loading");
    try {
      const params = new URLSearchParams({
        symbols: symbols.join(","),
        range,
        interval: "1d"
      });
      const res = await fetch(`/api/stocks/chart?${params.toString()}`);
      const payload = await readJsonResponse(res);
      const entries = (payload?.charts || [])
        .filter((chart) => chart.ok && chart.data?.length)
        .map((chart) => [chart.symbol, chart.data]);
      setCharts(Object.fromEntries(entries));
      setChartStatus(entries.length ? "ready" : "error");
    } catch (error) {
      console.warn("Yahoo chart API unavailable", error);
      setCharts({});
      setChartStatus("error");
    }
  }, []);

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
        const stockRes = await fetch("/api/robinhood/stocks");
        const catalog = await readJsonResponse(stockRes);
        const loadedStocks = catalog?.stocks || [];
        const loadedTokens = catalog?.payment_tokens || [];
        if (loadedStocks.length) {
          const nextStocks = loadedStocks.map((item, index) => decorateStock(item, index));
          setStocks(nextStocks);
          if (!nextStocks.some((item) => item.symbol === selected)) setSelected(nextStocks[0]?.symbol || "");
        }
        if (loadedTokens.length) {
          setPayTokens(loadedTokens);
          if (!loadedTokens.some((token) => token.symbol === payTokenSymbol)) setPayTokenSymbol(loadedTokens[0]?.symbol || "");
        }
      } catch (error) {
        console.warn("Robinhood stock API unavailable", error);
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
              const recommendation = recommendations.get(item.symbol);
              const price = prices.get(item.symbol);
              return decorateStock(item, index, recommendation, price);
            });
            setStocks(nextStocks);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    loadYahooCharts(stocks.map((item) => item.symbol), chartRange);
  }, [chartRange, loadYahooCharts, stocks]);

  React.useEffect(() => {
    if (!stock || !payToken) {
      setRoutePreview("Choose a supported stock to build a route preview.");
      return;
    }
    setRoutePreview(`${side === "sell" ? stock.symbol : payToken.symbol} -> ${side === "sell" ? payToken.symbol : stock.symbol}. Robinhood Chain ${side} quote will use exact contracts on chain 46630.`);
    setQuoteResult(null);
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
    setQuoteResult(null);
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
      setQuoteResult(payload);
      setRoutePreview("Quote prepared. Review the receipt before signing in your wallet.");
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
                <QuoteReceipt quote={quoteResult} />
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
            <div className="research-box">
              <StockChartView data={selectedChartData} ticker={stock.symbol} status={chartStatus} range={chartRange} onRangeChange={setChartRange} />
              <HermesOutputBar stock={stock} hermesOutput={hermesOutput} />
              <div className="research-brief">
                <span className="font-medium">Research brief</span>
                <ul className="research-list">{(stock.bullets || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <ResearchTabs
                stock={stock}
                hermesOutput={hermesOutput}
                activeTab={activeInsightTab}
                setActiveTab={setActiveInsightTab}
                backend={backend}
              />
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
