"use client";

/* eslint-disable @next/next/no-img-element */
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from "@reown/appkit/react";
import * as React from "react";
import { isAddress } from "viem";
import { usePublicClient, useSendTransaction } from "wagmi";
import { earningsEvents } from "./earningsData.js";
import { HermesReasoningGraph } from "./components/HermesReasoningGraph.jsx";
import {
  ROBINHOOD_CHAIN_EXPLORER,
  ROBINHOOD_CHAIN_ID,
  isReownConfigured,
  robinhoodChain
} from "./web3/config";

const Dither = React.lazy(() => import("./Dither.jsx"));
const InteractiveStockChart = React.lazy(() =>
  import("./components/InteractiveStockChart.jsx").then((module) => ({ default: module.InteractiveStockChart }))
);

const JOURNAL_STORAGE_KEY = "hermes-post-trade-journal";
const HERMES_PROGRESS = {
  boot: { percent: 8, label: "Loading stock desk", detail: "Preparing the Robinhood token catalog." },
  sources: { percent: 28, label: "Checking public sources", detail: "Reading health, supported stocks, and route readiness." },
  intel: { percent: 58, label: "Building stock context", detail: "Loading quotes, filings, calendars, Kalshi, and source checks." },
  model: { percent: 82, label: "Hermes model running", detail: "The frontend is ready while Hermes finishes the research output." },
  ready: { percent: 100, label: "Hermes output ready", detail: "Research output is available." },
  degraded: { percent: 100, label: "Hermes output degraded", detail: "Using deterministic stock context until Hermes responds cleanly." }
};
const HERMES_LOADING_WORDS = ["Thinking", "Pondering", "Assessing", "Scoring"];
const CHART_RANGES = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "1W", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1wk" }
];

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

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6"></path>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  );
}

function sourceHref(value) {
  const match = String(value || "").match(/https?:\/\/[^\s+]+/);
  return match ? match[0] : null;
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14"></path>
      <path d="m19 12-7 7-7-7"></path>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14"></path>
      <path d="M12 5v14"></path>
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14"></path>
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
      <path d="M9 18c-4.51 2-5-2-7-2"></path>
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.9 2.6 8.7 7.1 4.2 8.3l4.5 1.2 1.2 4.5 1.2-4.5 4.5-1.2-4.5-1.2-1.2-4.5Z"></path>
      <path d="M17.6 11.7 16.9 14l-2.3.7 2.3.7.7 2.3.7-2.3 2.3-.7-2.3-.7-.7-2.3Z"></path>
      <path d="M6.2 16.8 5.8 18l-1.2.4 1.2.4.4 1.2.4-1.2 1.2-.4-1.2-.4-.4-1.2Z"></path>
    </svg>
  );
}

function MotionAsset({ src, webmSrc, className }) {
  return (
    <video
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    >
      {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
      <source src={src} type="video/mp4" />
    </video>
  );
}

function splitReasoningText(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text
    .split(/(?:;\s+|\.\s+| · )/)
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 5);
}

function shortenAddress(value) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";
}

function toBigIntValue(value) {
  if (value === undefined || value === null || value === "" || value === "0" || value === "0x0") return undefined;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    if (/^0x[0-9a-fA-F]+$/.test(trimmed) || /^\d+$/.test(trimmed)) return BigInt(trimmed);
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeTransactionRequest(value, fallbackLabel) {
  if (!value || typeof value !== "object") return null;
  const request = value.transactionRequest || value.request || value.tx || value;
  const to = request.to || request.toAddress || request.target || request.router || request.routerAddress;
  if (!to || !isAddress(to)) return null;

  const data = request.data || request.callData || request.calldata || request.input;
  const transaction = {
    label: request.label || request.type || fallbackLabel || "Transaction",
    to,
    data: typeof data === "string" && data ? data : undefined,
    value: toBigIntValue(request.value || request.valueWei || request.nativeValue),
    gas: toBigIntValue(request.gas || request.gasLimit)
  };

  if (!transaction.data && !transaction.value) return null;
  return transaction;
}

function extractTransactionRequests(payload) {
  const transactions = [];
  const seenObjects = new Set();
  const seenTransactions = new Set();

  function visit(value, label = "Transaction", depth = 0) {
    if (!value || depth > 7) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${label} ${index + 1}`, depth + 1));
      return;
    }
    if (typeof value !== "object" || seenObjects.has(value)) return;
    seenObjects.add(value);

    const transaction = normalizeTransactionRequest(value, label);
    if (transaction) {
      const key = `${transaction.to}:${transaction.data || ""}:${transaction.value?.toString() || "0"}`;
      if (!seenTransactions.has(key)) {
        seenTransactions.add(key);
        transactions.push(transaction);
      }
    }

    for (const [key, nested] of Object.entries(value)) {
      if (/abi|logs?|stock_universe/i.test(key)) continue;
      const nextLabel = /approve|allowance/i.test(key)
        ? "Approval"
        : /swap|trade|execute|transaction|tx/i.test(key)
        ? "Swap"
        : label;
      visit(nested, nextLabel, depth + 1);
    }
  }

  visit(payload);
  return transactions;
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
          <button className="icon-button" type="button" aria-label="Close token picker" onClick={onClose}>
            <XIcon />
          </button>
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

function StockChartView({ data, ticker, status, selectedRange }) {
  return data?.length ? (
    <div className="chart-shell">
      <React.Suspense fallback={<div className="chart-fallback" />}>
        <InteractiveStockChart chartData={data} ticker={ticker} selectedRange={selectedRange} key={`${ticker}-${selectedRange}-${data.length}`} />
      </React.Suspense>
    </div>
  ) : (
    <div className="chart-fallback chart-state">
      {status === "loading" ? "Loading chart" : "Chart unavailable from Yahoo."}
    </div>
  );
}

function ChartRangeControls({ selectedRange, onRangeChange }) {
  return (
    <div className="chart-range-controls" aria-label="Chart range">
      {CHART_RANGES.map((item) => (
        <button
          className={selectedRange === item.label ? "active" : ""}
          type="button"
          key={item.label}
          onClick={() => onRangeChange(item.label)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MiniStockChart({ data }) {
  const points = React.useMemo(() => {
    const closes = (data || []).slice(-24).map((item) => Number(item.close)).filter(Number.isFinite);
    if (closes.length < 2) return "";
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    return closes
      .map((value, index) => {
        const x = (index / (closes.length - 1)) * 86 + 2;
        const y = 30 - ((value - min) / range) * 24 + 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <svg className="mini-stock-chart" viewBox="0 0 90 36" aria-hidden="true">
      {points ? <polyline points={points} /> : <line x1="4" y1="24" x2="86" y2="24" />}
    </svg>
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
  return {
    ...item,
    logoText: presentation.logoText || item.symbol.slice(0, 2),
    logoUrl: presentation.logoUrl || item.logoUrl,
    logoBg: presentation.logoBg || "#fff",
    logoFg: presentation.logoFg || "#202621",
    score: recommendation?.confidence || 0,
    bullets: [
      recommendation?.reason,
      recommendation?.next_step,
      price?.ok && price.close ? `Public quote close ${price.close}${price.date ? ` on ${price.date}` : ""}.` : null
    ].filter(Boolean)
  };
}

function HermesOutputBar({ stock, hermesOutput, loading, progress }) {
  const score = Math.max(0, Math.min(stock.score || 0, 100));
  const decision = hermesOutput?.hermes_decision?.stocks?.find((item) => item.symbol === stock.symbol);
  const [loadingWordIndex, setLoadingWordIndex] = React.useState(0);

  React.useEffect(() => {
    if (!loading) return undefined;
    const timer = window.setInterval(() => {
      setLoadingWordIndex((current) => (current + 1) % HERMES_LOADING_WORDS.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, [loading]);

  const fallbackStance = decision?.action || (score >= 64 ? "WATCH" : "NO_BUY");
  const stance = loading ? HERMES_LOADING_WORDS[loadingWordIndex] : fallbackStance;
  const displayScore = loading ? Math.max(4, Math.min(progress?.percent || 0, 99)) : decision?.confidence || score;
  const reasoning =
    decision?.reason ||
    hermesOutput?.reply ||
    (loading ? "Hermes is collecting market, filing, quote, and route evidence before returning a decision." : `${stock.symbol} selected. Contract is ready for Robinhood testnet quote prep.`);
  const reasoningPoints = splitReasoningText(reasoning);
  return (
    <div className="cn-card score-card">
      <div className="cn-card-content">
        <div className="score-head">
          <div className="score-left">
            <div className="score-radial" aria-label={`Hermes confidence ${displayScore}%`}>
            <svg cx="50%" cy="50%" role="application" tabIndex="0" className="recharts-surface" width="282" height="180" viewBox="0 0 282 180" style={{ width: "100%", height: "100%", display: "block" }}>
              <title></title>
              <desc></desc>
              <g tabIndex="-1" className="recharts-zIndex-layer_-100"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_-50"></g>
              <defs>
                <clipPath id="hermes-score-clip">
                  <rect x="0" y="0" height="200" width="282"></rect>
                </clipPath>
              </defs>
              <g tabIndex="-1" className="recharts-zIndex-layer_100">
                <g className="recharts-layer recharts-pie" tabIndex="0">
                  <g className="recharts-layer">
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="var(--primary)" stroke="#fff" name="2023-11-30" tabIndex="-1" data-recharts-item-index="0" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 226,100 A 85,85,0,0,0,225.7929,94.0707 L 200.8538,95.8146 A 60,60,0,0,1,201,100 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="var(--primary)" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="1" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 224.9535,86.7031 A 85,85,0,0,0,223.8215,80.8792 L 199.4622,86.5029 A 60,60,0,0,1,200.2613,90.6139 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="var(--primary)" stroke="#fff" name="2023-11-20" tabIndex="-1" data-recharts-item-index="2" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 221.8398,73.7336 A 85,85,0,0,0,219.8106,68.1584 L 196.631,77.5236 A 60,60,0,0,1,198.0634,81.459 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="var(--primary)" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="3" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 216.7356,61.4108 A 85,85,0,0,0,213.8592,56.2218 L 192.43,69.0977 A 60,60,0,0,1,194.4604,72.7606 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="var(--primary)" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="4" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 209.7664,50.0383 A 85,85,0,0,0,206.1138,45.3631 L 186.9627,61.4327 A 60,60,0,0,1,189.541,64.7329 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 90%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="5" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 201.1041,39.8959 A 85,85,0,0,0,196.765,35.8497 L 180.3635,54.7174 A 60,60,0,0,1,183.4264,57.5736 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 90%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="6" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 190.9617,31.2336 A 85,85,0,0,0,186.0431,27.9159 L 172.7952,49.1171 A 60,60,0,0,1,176.2671,51.459 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 80%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="7" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 179.5892,24.2644 A 85,85,0,0,0,174.2121,21.7571 L 164.4439,44.7697 A 60,60,0,0,1,168.2394,46.5396 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 80%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="8" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 167.2664,19.1602 A 85,85,0,0,0,161.5634,17.5249 L 155.5153,41.7823 A 60,60,0,0,1,159.541,42.9366 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 70%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="9" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 154.2969,16.0465 A 85,85,0,0,0,148.4082,15.3235 L 146.2293,40.2283 A 60,60,0,0,1,150.3861,40.7387 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 70%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="10" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 141,15 A 85,85,0,0,0,135.0707,15.2071 L 136.8146,40.1462 A 60,60,0,0,1,141,40 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 60%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="11" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 127.7031,16.0465 A 85,85,0,0,0,121.8792,17.1785 L 127.5029,41.5378 A 60,60,0,0,1,131.6139,40.7387 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 60%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="12" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 114.7336,19.1602 A 85,85,0,0,0,109.1584,21.1894 L 118.5236,44.369 A 60,60,0,0,1,122.459,42.9366 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 50%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="13" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 102.4108,24.2644 A 85,85,0,0,0,97.2218,27.1408 L 110.0977,48.57 A 60,60,0,0,1,113.7606,46.5396 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 50%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="14" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 91.0383,31.2336 A 85,85,0,0,0,86.3631,34.8862 L 102.4327,54.0373 A 60,60,0,0,1,105.7329,51.459 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 40%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="15" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 80.8959,39.8959 A 85,85,0,0,0,76.8497,44.235 L 95.7174,60.6365 A 60,60,0,0,1,98.5736,57.5736 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 40%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="16" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 72.2336,50.0383 A 85,85,0,0,0,68.9159,54.9569 L 90.1171,68.2048 A 60,60,0,0,1,92.459,64.7329 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 30%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="17" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 65.2644,61.4108 A 85,85,0,0,0,62.7571,66.7879 L 85.7697,76.5561 A 60,60,0,0,1,87.5396,72.7606 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 30%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="18" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 60.1602,73.7336 A 85,85,0,0,0,58.5249,79.4366 L 82.7823,85.4847 A 60,60,0,0,1,83.9366,81.459 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 20%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="19" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 57.0465,86.7031 A 85,85,0,0,0,56.3235,92.5918 L 81.2283,94.7707 A 60,60,0,0,1,81.7387,90.6139 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 20%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="20" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 56,100 A 85,85,0,0,0,56.2071,105.9293 L 81.1462,104.1854 A 60,60,0,0,1,81,100 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 10%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="21" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 57.0465,113.2969 A 85,85,0,0,0,58.1785,119.1208 L 82.5378,113.4971 A 60,60,0,0,1,81.7387,109.3861 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 10%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="22" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 60.1602,126.2664 A 85,85,0,0,0,62.1894,131.8416 L 85.369,122.4764 A 60,60,0,0,1,83.9366,118.541 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 5%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="23" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 65.2644,138.5892 A 85,85,0,0,0,68.1408,143.7782 L 89.57,130.9023 A 60,60,0,0,1,87.5396,127.2394 Z"></path></g></g>
                    <g className="recharts-layer recharts-pie-sector" tabIndex="-1"><g className="recharts-layer recharts-shape"><path cx="141" cy="100" fill="color-mix(in oklab, var(--primary) 5%, var(--background))" stroke="#fff" name="2023-12-12" tabIndex="-1" data-recharts-item-index="24" data-recharts-item-id="recharts-pie-_r_2_" className="recharts-sector" d="M 72.2336,149.9617 A 85,85,0,0,0,75.8862,154.6369 L 95.0373,138.5673 A 60,60,0,0,1,92.459,135.2671 Z"></path></g></g>
                  </g>
                  <text x="141" y="100" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="141" y="104" className="score-radial-value">{displayScore}%</tspan>
                  </text>
                </g>
              </g>
              <g tabIndex="-1" className="recharts-zIndex-layer_200"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_300"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_400"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_500"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_600"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_1000"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_1100"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_1200"></g>
              <g tabIndex="-1" className="recharts-zIndex-layer_2000"></g>
            </svg>
            </div>
            <div className="score-copy">
              <button className="score-action-pill" type="button" disabled={loading}>
                <span key={stance} className={loading ? "rotating-word" : ""}>{stance}</span>
              </button>
            </div>
          </div>
          <div className="score-reasoning">
            <span>{loading ? "Hermes model running" : "Reasoning"}</span>
            <div className="reasoning-point-list">
              {reasoningPoints.length ? reasoningPoints.map((point) => <p key={point}>{point}</p>) : <p>{reasoning}</p>}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="thinking-state">
            <MotionAsset src="/media/icons/hermes-thinking.mp4" webmSrc="/media/icons/hermes-thinking.webm" className="thinking-motion" />
            <div className="hermes-progress-copy">
              <span>{progress?.label || "Hermes thinking..."}</span>
            </div>
          </div>
        ) : null}
        {loading ? (
          <div className="hermes-progress-track" aria-label={`Hermes output progress ${progress?.percent || 0}%`}>
            <div style={{ width: `${Math.max(4, Math.min(progress?.percent || 0, 100))}%` }}></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") return "n/a";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-US") : String(value);
}

function formatMoney(value) {
  if (value === undefined || value === null || value === "") return "n/a";
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toLocaleString("en-US")}` : String(value);
}

function formatConfidence(value) {
  if (value === undefined || value === null || value === "") return "No score";
  const number = Number(value);
  return Number.isFinite(number) ? `${number}/100 confidence` : `${value} confidence`;
}

function formatEarningsDate(value) {
  if (!value) return "n/a";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatKalshiVolume(value) {
  if (value === undefined || value === null || value === "") return "n/a";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (number <= 0) return "n/a";
  return number.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function firstNonZeroValue(...values) {
  return values.find((value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  });
}

function averagePricePercent(bid, ask) {
  const values = [bid, ask].map(Number).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100);
}

function kalshiMarketUrl(market) {
  const ticker = market?.ticker || market?.event_ticker;
  return ticker ? `https://kalshi.com/markets/${ticker}` : "https://kalshi.com/markets";
}

function earningsSummary(symbol) {
  const today = dateKey(new Date());
  const events = earningsEvents.filter((event) => event.symbol === symbol).sort((a, b) => a.date.localeCompare(b.date));
  const latest = [...events].reverse().find((event) => event.date <= today);
  const next = events.find((event) => event.date > today);
  return { latest, next };
}

function eventQuarter(date) {
  if (!date) return "n/a";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "n/a";
  return `Q${Math.floor(parsed.getMonth() / 3) + 1} ${parsed.getFullYear()}`;
}

function HermesDataTable({ stocks, hermesOutput }) {
  const intel = hermesOutput?.data;
  const calendars = new Map((intel?.calendars || []).map((item) => [item.symbol, item]));
  const prices = new Map((intel?.stock_signals?.prices || []).map((item) => [item.symbol, item]));
  const filings = new Map((intel?.stock_signals?.filings || []).map((item) => [item.symbol, item]));
  const news = new Map((intel?.stock_signals?.news || []).map((item) => [item.symbol, item]));
  const decisionRows = hermesOutput?.hermes_decision?.stocks || intel?.hermes_decision?.stocks || [];
  const decisions = new Map(decisionRows.map((item) => [item.symbol, item]));
  const kalshi = new Map((intel?.kalshi?.stocks || []).map((item) => [item.stock?.symbol, item]));

  return (
    <section className="panel hermes-data-section" aria-label="Hermes stock data table">
      <div className="hermes-table-wrap">
        <table className="hermes-data-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th>Earnings</th>
              <th>Hermes</th>
              <th>Latest quote</th>
              <th>SEC filing</th>
              <th>News</th>
              <th>Kalshi</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const calendar = calendars.get(stock.symbol);
              const price = prices.get(stock.symbol);
              const filing = filings.get(stock.symbol);
              const latestFiling = filing?.latest_material || decisions.get(stock.symbol)?.latest_filing;
              const newsRow = news.get(stock.symbol);
              const decision = decisions.get(stock.symbol);
              const kalshiRow = kalshi.get(stock.symbol);
              const topMarket = kalshiRow?.markets?.[0];
              const earnings = earningsSummary(stock.symbol);
              const backendDate = calendar?.earnings_dates?.[0];
              const nextEarnings = backendDate || earnings.next?.date;
              const latestEarnings = earnings.latest?.date;
              const estimates = [
                calendar?.estimates?.earnings_average ? `EPS ${calendar.estimates.earnings_average}` : null,
                calendar?.estimates?.revenue_average ? `Rev ${calendar.estimates.revenue_average}` : null
              ].filter(Boolean).join(" / ");
              const topArticles = (newsRow?.top_articles || []).slice(0, 2);

              return (
                <tr key={stock.symbol}>
                  <td>
                    <div className="table-stock">
                      <Logo stock={stock} />
                      <span>{stock.symbol}</span>
                    </div>
                  </td>
                  <td>
                    <div>{nextEarnings ? `Next ${formatEarningsDate(nextEarnings)}` : "No upcoming date"}</div>
                    <small>{latestEarnings ? `Last ${formatEarningsDate(latestEarnings)}` : "No 2020+ history"}{estimates ? ` · ${estimates}` : ""}</small>
                  </td>
                  <td>
                    <div>{decision?.action || "n/a"}</div>
                    <small>{formatConfidence(decision?.confidence)}</small>
                  </td>
                  <td>
                    <div>{price?.ok ? formatMoney(price.close) : "n/a"}</div>
                    <small>{price?.ok ? `${formatNumber(price.volume)} vol · ${price.date || "no date"}` : price?.error || "No quote"}</small>
                  </td>
                  <td>
                    {latestFiling?.document_url ? (
                      <a href={latestFiling.document_url} target="_blank" rel="noreferrer">{latestFiling.form}</a>
                    ) : (
                      <span>{latestFiling?.form || "n/a"}</span>
                    )}
                    <small>{latestFiling?.filing_date || filing?.error || "No filing"}</small>
                  </td>
                  <td>
                    <div>{newsRow?.article_count ?? decision?.news_count ?? 0} articles</div>
                    <small>
                      {topArticles.length
                        ? topArticles.map((article) => article.title).join(" | ")
                        : newsRow?.error || "No recent articles"}
                    </small>
                  </td>
                  <td>
                    <div>
                      {topMarket
                        ? `YES ${topMarket.yes_bid_dollars || "n/a"}/${topMarket.yes_ask_dollars || "n/a"}`
                        : "No match"}
                    </div>
                    <small>
                      {topMarket
                        ? `NO ${topMarket.no_bid_dollars || "n/a"}/${topMarket.no_ask_dollars || "n/a"} · ${topMarket.ticker}`
                      : `${kalshiRow?.match_count || 0} matched markets`}
                    </small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EarningsBacktestTable({ stock, backtest, loading }) {
  const [expanded, setExpanded] = React.useState(false);
  const rows = backtest?.rows || [];
  return (
    <section className={`hermes-module earnings-backtest ${expanded ? "expanded" : ""}`} aria-label="Hermes backtest">
      <button className="backtest-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
        <div>
          <h3>Hermes Backtest</h3>
          <span>{loading ? "Running" : rows.length ? "Previous 3 earnings" : "No rows yet"}</span>
        </div>
        {expanded ? <MinusIcon /> : <PlusIcon />}
      </button>
      {expanded ? (
        <>
          {loading ? (
            <div className="backtest-loading">
              <MotionAsset src="/media/icons/hermes-output-orb.mp4" webmSrc="/media/icons/hermes-output-orb.webm" className="backtest-motion" />
              <div>
                <strong>Hermes is benchmarking {stock?.symbol || "stock"} earnings</strong>
                <span>Checking price reaction, Kalshi matches, date-bounded news, and model commentary.</span>
              </div>
            </div>
          ) : rows.length ? (
            <div className="backtest-table-wrap">
              <table className="backtest-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Move</th>
                    <th>Benchmark</th>
                    <th>Kalshi</th>
                    <th>News</th>
                    <th>Hermes read</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.symbol}-${row.earnings_date}`}>
                      <td>
                        <strong>{formatEarningsDate(row.earnings_date)}</strong>
                        <small>{row.quarter}</small>
                      </td>
                      <td>
                        <strong className={Number(row.move_percent) >= 0 ? "positive" : "negative"}>
                          {row.move_percent === undefined ? "n/a" : `${row.move_percent}%`}
                        </strong>
                        <small>{formatMoney(row.price_before)} → {formatMoney(row.price_after)}</small>
                      </td>
                      <td>
                        <span className={`benchmark-pill ${row.benchmark}`}>{row.benchmark}</span>
                      </td>
                      <td>
                        <strong>{row.kalshi?.matched ? `${row.kalshi.market_count} match${row.kalshi.market_count === 1 ? "" : "es"}` : "No match"}</strong>
                        <small>{row.kalshi?.top_market?.ticker || "Public feed did not return a usable historic market"}</small>
                      </td>
                      <td>
                        <strong>{row.news?.article_count || 0} articles</strong>
                        <small>{row.news?.top_headlines?.[0] || "No bounded headline returned"}</small>
                      </td>
                      <td>{row.analysis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="module-empty">No backtest rows returned for {stock?.symbol || "this stock"}.</p>
          )}
          <div className="source-footnote">
            <span>Sources</span>
            <p>Yahoo Chart OHLC, GDELT event-window headlines, Kalshi public markets, and OpenRouter analysis.</p>
          </div>
        </>
      ) : null}
    </section>
  );
}

function getHermesContext(stock, hermesOutput) {
  const intel = hermesOutput?.data;
  if (!stock || !intel) return {};
  const decision = (hermesOutput?.hermes_decision?.stocks || intel?.hermes_decision?.stocks || []).find((item) => item.symbol === stock.symbol);
  const recommendation = (intel?.recommendations || []).find((item) => item.symbol === stock.symbol);
  const calendar = (intel?.calendars || []).find((item) => item.symbol === stock.symbol);
  const price = (intel?.stock_signals?.prices || []).find((item) => item.symbol === stock.symbol);
  const filing = (intel?.stock_signals?.filings || []).find((item) => item.symbol === stock.symbol);
  const news = (intel?.stock_signals?.news || []).find((item) => item.symbol === stock.symbol);
  const kalshi = (intel?.kalshi?.stocks || []).find((item) => item.stock?.symbol === stock.symbol);
  const explorerConfirmed = (intel?.explorer_discovery?.tokens || []).some(
    (token) => token.routed_by_agent && token.address?.toLowerCase() === stock.address?.toLowerCase()
  );
  return { intel, decision, recommendation, calendar, price, filing, news, kalshi, explorerConfirmed };
}

function qualityText(ok) {
  return ok ? "OK" : "Degraded";
}

function sourceHealthText(intel) {
  const degraded = intel?.pipeline?.degraded_sources || [];
  return degraded.length ? `Degraded: ${degraded.join(", ")}` : "Sources OK";
}

function WhyRoutePanel({ stock, payToken, side, wallet, connectedToRobinhood, quote, quoteTransactions, hermesOutput }) {
  const { decision, price, filing, news, kalshi, explorerConfirmed } = getHermesContext(stock, hermesOutput);
  const isSell = side === "sell";
  const source = isSell ? stock : payToken;
  const target = isSell ? payToken : stock;
  const evidence = [
    stock?.address ? "official Robinhood Chain stock contract" : null,
    price?.ok ? `latest close ${formatMoney(price.close)}${price.date ? ` on ${price.date}` : ""}` : null,
    filing?.latest_material ? `latest SEC ${filing.latest_material.form}` : null,
    news?.article_count ? `${news.article_count} recent news article(s)` : null,
    kalshi?.match_count ? `${kalshi.match_count} Kalshi market match(es)` : null,
    explorerConfirmed ? "contract seen in explorer discovery" : null
  ].filter(Boolean);

  return (
    <section className="hermes-module why-route-panel" aria-label="Why this route">
      <div className="module-kicker">Why this route?</div>
      <div className="route-line">
        <span>{source?.symbol || "Token"}</span>
        <span>→</span>
        <span>{target?.symbol || "Stock"}</span>
      </div>
      <p>{decision?.reason || "Hermes is waiting for enough clean public evidence before recommending a route."}</p>
      <div className="route-state-grid">
        <div>
          <span>Action</span>
          <strong>{decision?.action || "n/a"}</strong>
        </div>
        <div>
          <span>Wallet</span>
          <strong>{wallet ? shortenAddress(wallet) : "not connected"}</strong>
        </div>
        <div>
          <span>Network</span>
          <strong>{connectedToRobinhood ? "Robinhood Chain" : "pending"}</strong>
        </div>
        <div>
          <span>Quote</span>
          <strong>{quoteTransactions.length ? "ready to sign" : quote ? "prepared" : "not prepared"}</strong>
        </div>
      </div>
      <div className="evidence-list">
        {evidence.length ? evidence.map((item) => <span key={item}>{item}</span>) : <span>No clean evidence yet</span>}
      </div>
    </section>
  );
}

function ConfidenceDecomposition({ stock, hermesOutput }) {
  const [expandedSegment, setExpandedSegment] = React.useState(null);
  const { decision, calendar, price, filing, news, kalshi, explorerConfirmed } = getHermesContext(stock, hermesOutput);
  const topMarket = kalshi?.markets?.[0];
  const baseValue = stock?.address ? 35 : 0;
  const marketValue = topMarket ? Math.min(Number(topMarket.score || 0) * 5, 30) : 0;
  const signalValue =
    (calendar?.ok ? 15 : 0) +
    (price?.ok ? 10 : 0) +
    (filing?.ok && filing.latest_material ? 10 : 0) +
    Math.min((news?.article_count || 0) * 2, 8);
  const explorerValue = explorerConfirmed ? 10 : 0;
  const rawSegments = [
    { label: "Route", value: baseValue, note: stock?.address ? "Official Robinhood Chain stock token contract exists." : "No official stock token route is available.", color: "#a6979c" },
    { label: "Market", value: marketValue, note: topMarket?.title || topMarket?.ticker || "No clean Kalshi market match.", color: "#407076" },
    { label: "Signals", value: signalValue, note: [price?.date ? `Quote date ${price.date}` : null, filing?.latest_material?.form ? `SEC ${filing.latest_material.form}` : null, news?.article_count ? `${news.article_count} news item(s)` : null].filter(Boolean).join(" · ") || "Public feeds did not add fresh signal.", color: "#ccff00" },
    { label: "Explorer", value: explorerValue, note: explorerConfirmed ? "Contract found in Robinhood Chain explorer discovery." : "Explorer confirmation not found yet.", color: "#04151f" }
  ];
  const contributionTotal = Math.max(1, rawSegments.reduce((sum, segment) => sum + segment.value, 0));
  const segments = rawSegments.map((segment) => ({
    ...segment,
    percent: Math.round((segment.value / contributionTotal) * 100)
  }));
  const selectedSegment = segments.find((segment) => segment.label === expandedSegment);
  const total = decision?.confidence ?? Math.min(95, contributionTotal);
  const summaryFactors = segments.map((segment) => ({ label: segment.label, note: segment.note }));

  return (
    <div data-slot="card" data-size="default" className="cn-card confidence-panel confidence-breakdown-card">
      <div data-slot="card-content" className="cn-card-content confidence-breakdown-content">
        <div className="confidence-breakdown-head">
          <span className="text-3xl font-semibold">{total}/100</span>
        </div>
        <div className="confidence-category-stack">
          <div aria-label="Hermes confidence category bar">
            <div className="confidence-category-bar">
              <div className="confidence-category-track">
                {segments.map((segment) => (
                  <button
                    className="confidence-category-segment"
                    type="button"
                    style={{ width: `${segment.percent}%`, backgroundColor: segment.color }}
                    key={segment.label}
                    aria-label={`${segment.label} confidence detail`}
                    aria-expanded={selectedSegment?.label === segment.label}
                    onClick={() => setExpandedSegment((current) => (current === segment.label ? null : segment.label))}
                  ></button>
                ))}
              </div>
            </div>
          </div>
          <ul className="confidence-category-legend">
            {segments.map((segment) => (
              <li key={segment.label}>
                <button
                  className="confidence-legend-button"
                  type="button"
                  aria-expanded={selectedSegment?.label === segment.label}
                  onClick={() => setExpandedSegment((current) => (current === segment.label ? null : segment.label))}
                >
                  <span className="legend-swatch" style={{ backgroundColor: segment.color }}></span>
                  <span className="font-medium">{segment.percent}%</span>
                  <span className="text-muted-foreground">{segment.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {selectedSegment ? (
            <div className="confidence-segment-detail" style={{ "--segment-color": selectedSegment.color }}>
              <span>{selectedSegment.label}</span>
              <div className="factor-detail-list">
                {splitReasoningText(selectedSegment.note).map((item) => <p key={item}>{item}</p>)}
              </div>
            </div>
          ) : null}
        </div>
        <div data-orientation="horizontal" role="none" data-slot="separator" className="confidence-separator"></div>
        <div className="confidence-summary">
          <span className="font-medium">{decision?.action || "Hermes"} confidence factors</span>
          <div className="confidence-summary-grid">
            {summaryFactors.map((factor) => (
              <article key={factor.label}>
                <span>{factor.label}</span>
                <p>{factor.note}</p>
              </article>
            ))}
          </div>
          <small className="confidence-formula-note">
            Formula: 35 route + up to 30 Kalshi market quality + 15 calendar + 10 latest quote + 10 SEC filing + up to 8 news + 10 explorer, capped at 95.
          </small>
        </div>
      </div>
    </div>
  );
}

function PredictionMarketOverlay({ stock, hermesOutput }) {
  const { kalshi } = getHermesContext(stock, hermesOutput);
  const markets = (kalshi?.markets || []).slice(0, 3);

  return (
    <section className="hermes-module prediction-overlay" aria-label="Prediction market overlay">
      <div className="module-head prediction-head">
        <div>
          <h3 className="kalshi-market-title">
            <img src="/logos/kalshilogopng.png" alt="Kalshi" />
            <span>markets</span>
          </h3>
        </div>
      </div>
      {markets.length ? (
        <div className="market-stack">
          {markets.map((market) => {
            const yesProbability = averagePricePercent(market.yes_bid_dollars, market.yes_ask_dollars);
            const noProbability = averagePricePercent(market.no_bid_dollars, market.no_ask_dollars);
            const bestSide = (noProbability || 0) > (yesProbability || 0) ? "NO" : "YES";
            const bestProbability = bestSide === "NO" ? noProbability : yesProbability;
            const volume = firstNonZeroValue(market.volume_24h_fp, market.volume_fp, market.volume);
            const closeTime = market.close_time || market.expected_expiration_time;
            return (
              <article className="market-row" key={market.ticker}>
                <div className="market-title-block">
                  <a href={kalshiMarketUrl(market)} target="_blank" rel="noreferrer">
                    {market.title || market.series_title || "Kalshi market"}
                  </a>
                </div>
                <div className="market-card-layout">
                  <div className="market-probability-card">
                    <span>{bestSide}</span>
                    <strong>{bestProbability !== null ? `${bestProbability}%` : "n/a"}</strong>
                  </div>
                  <dl className="market-meta-grid">
                    <div><dt>Close</dt><dd>{formatDateTime(closeTime)}</dd></div>
                    <div><dt>Volume</dt><dd>{formatKalshiVolume(volume)}</dd></div>
                    <div><dt>Market rules</dt><dd>{market.rules_primary || market.title || "n/a"}</dd></div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-module-note">Hermes did not find a machine-readable Kalshi market cleanly tied to this stock.</p>
      )}
    </section>
  );
}

function DataProvenanceView({ hermesOutput }) {
  const [expanded, setExpanded] = React.useState(false);
  const intel = hermesOutput?.data;
  const checks = intel?.pipeline?.checks || [];

  return (
    <section className={`hermes-module provenance-view ${expanded ? "expanded" : ""}`} aria-label="Data provenance">
      <div className="module-head">
        <div>
          <h3>Data Feed</h3>
        </div>
        <button className="provenance-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          <span>{expanded ? "Collapse" : "Expand"}</span>
          {expanded ? <MinusIcon /> : <PlusIcon />}
        </button>
      </div>
      {expanded ? (
        <div className="provenance-list">
          {checks.map((check) => (
            <div className={`provenance-row ${check.ok ? "ok" : "degraded"}`} key={check.name}>
              <div>
                <span>{check.name.replaceAll("_", " ")}</span>
                {sourceHref(check.source) ? (
                  <a className="source-button" href={sourceHref(check.source)} target="_blank" rel="noreferrer">Source</a>
                ) : null}
              </div>
              <strong>{check.records ?? 0} records</strong>
              {check.error ? <p>{check.error}</p> : check.note ? <p>{check.note}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function previewHermesOutput(intel) {
  return {
    reply: intel?.hermes_decision?.summary || "Hermes is building the model-written research output.",
    hermes_decision: intel?.hermes_decision,
    data: intel,
    tool_trace: [
      { name: "buildStockIntel", ok: Boolean(intel?.ok), degraded_sources: intel?.pipeline?.degraded_sources || [] },
      { name: "openrouter_chat", ok: false, pending: true }
    ]
  };
}

function PostTradeJournal({ entries, stock }) {
  const visibleEntries = entries.filter((entry) => !stock || entry.symbol === stock.symbol).slice(0, 6);

  return (
    <section className="hermes-module journal-view" aria-label="Post-trade journal">
      <div className="module-head">
        <div>
          <div className="module-kicker">Post-trade journal</div>
          <h3>{visibleEntries.length} event(s)</h3>
        </div>
      </div>
      {visibleEntries.length ? (
        <div className="journal-stack">
          {visibleEntries.map((entry) => (
            <article className="journal-entry" key={entry.id}>
              <div>
                <span>{entry.status}</span>
                <time>{new Date(entry.timestamp).toLocaleString()}</time>
              </div>
              <p>{entry.side?.toUpperCase()} {entry.amount || "0"} {entry.sourceSymbol} → {entry.targetSymbol}</p>
              <small>
                Hermes {entry.hermesAction || "n/a"} · {formatConfidence(entry.hermesConfidence)} · {entry.sourceHealth || "source state unknown"}
              </small>
              {entry.hashes?.length ? (
                <div className="journal-links">
                  {entry.hashes.map((hash) => (
                    <a key={hash} href={`${ROBINHOOD_CHAIN_EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">{shortenAddress(hash)}</a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-module-note">Quote prep and confirmed wallet transactions will appear here with the Hermes evidence snapshot.</p>
      )}
    </section>
  );
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthTitle(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildCalendarDays(monthDate) {
  const first = monthStart(monthDate);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function EarningsCalendar({ events, stocks, monthDate, onMonthChange, onSelectStock }) {
  const [expanded, setExpanded] = React.useState(false);
  const supported = React.useMemo(() => new Map(stocks.map((item) => [item.symbol, item])), [stocks]);
  const eventsByDate = React.useMemo(() => {
    const grouped = new Map();
    events
      .filter((event) => supported.has(event.symbol))
      .filter((event) => event.date >= "2020-01-01")
      .forEach((event) => {
        const group = grouped.get(event.date) || [];
        group.push(event);
        grouped.set(event.date, group);
      });
    return grouped;
  }, [events, supported]);
  const today = new Date();
  const days = buildCalendarDays(monthDate);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className={`earnings-calendar ${expanded ? "expanded" : ""}`} aria-label="Supported stock earnings calendar">
      <div className="earnings-calendar-toolbar">
        <button className="calendar-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          <span>Earnings Calendar</span>
          {expanded ? <MinusIcon /> : <PlusIcon />}
        </button>
        <button className="calendar-icon-button" type="button" aria-label="Previous month" onClick={() => onMonthChange(addMonths(monthDate, -1))}>
          <ChevronLeftIcon />
        </button>
        <button className="calendar-icon-button" type="button" aria-label="Next month" onClick={() => onMonthChange(addMonths(monthDate, 1))}>
          <ChevronRightIcon />
        </button>
      </div>
      {expanded ? (
        <>
          <div className="earnings-calendar-weekdays">
            {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="earnings-calendar-grid">
            {days.map((day) => {
              const key = dateKey(day);
              const inMonth = day.getMonth() === monthDate.getMonth();
              const isToday = key === dateKey(today);
              const dayEvents = eventsByDate.get(key) || [];
              return (
                <div className={`earnings-day ${inMonth ? "" : "outside"} ${isToday ? "today" : ""}`} key={key}>
                  <div className="earnings-day-number">{day.getDate()}</div>
                  <div className="earnings-day-events">
                    {dayEvents.map((event) => {
                      const eventStock = supported.get(event.symbol);
                      return (
                        <button
                          className={`earnings-event ${event.symbol.toLowerCase()}`}
                          key={`${event.symbol}-${event.date}`}
                          type="button"
                          onClick={() => onSelectStock(event.symbol)}
                          aria-label={`${event.symbol} earnings on ${formatEarningsDate(event.date)}`}
                        >
                          {eventStock ? <Logo stock={eventStock} /> : null}
                          <span>{event.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { chainId, switchNetwork } = useAppKitNetwork();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });
  const { sendTransactionAsync, isPending: walletPending } = useSendTransaction();

  const [selected, setSelected] = React.useState("TSLA");
  const [side, setSide] = React.useState("buy");
  const [stocks, setStocks] = React.useState([]);
  const [payTokens, setPayTokens] = React.useState([]);
  const [payTokenSymbol, setPayTokenSymbol] = React.useState("USDG");
  const [amount, setAmount] = React.useState("");
  const [tokenPicker, setTokenPicker] = React.useState(null);
  const [backend, setBackend] = React.useState({ health: false, intel: false, trade: false });
  const [hermesOutput, setHermesOutput] = React.useState(null);
  const [hermesLoading, setHermesLoading] = React.useState(true);
  const [hermesProgress, setHermesProgress] = React.useState(HERMES_PROGRESS.boot);
  const [backtests, setBacktests] = React.useState({});
  const [backtestStatus, setBacktestStatus] = React.useState("idle");
  const [charts, setCharts] = React.useState({});
  const [miniCharts, setMiniCharts] = React.useState({});
  const [chartStatus, setChartStatus] = React.useState("idle");
  const [chartRange, setChartRange] = React.useState("1M");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(() => monthStart(new Date()));
  const [quote, setQuote] = React.useState(null);
  const [quoteTransactions, setQuoteTransactions] = React.useState([]);
  const [tradeStatus, setTradeStatus] = React.useState("");
  const [tradeError, setTradeError] = React.useState("");
  const [txHashes, setTxHashes] = React.useState([]);
  const [isPreparingQuote, setIsPreparingQuote] = React.useState(false);
  const [isExecutingQuote, setIsExecutingQuote] = React.useState(false);
  const [journalEntries, setJournalEntries] = React.useState([]);

  const stock = stocks.find((item) => item.symbol === selected);
  const payToken = payTokens.find((token) => token.symbol === payTokenSymbol) || payTokens[0];
  const sourceToken = side === "sell" ? stock : payToken;
  const targetToken = side === "sell" ? payToken : stock;
  const amountNumber = Number(amount || 0);
  const selectedScore = stock ? stock.score : 0;
  const estimatedOutput = stock && amountNumber > 0 ? (amountNumber / Math.max(stock.score, 1)).toFixed(6) : "0";
  const selectedChartData = stock ? charts[stock.symbol] || [] : [];
  const wallet = address || "";
  const connectedToRobinhood = Number(chainId) === ROBINHOOD_CHAIN_ID;
  const tradeBusy = isPreparingQuote || isExecutingQuote || walletPending;
  const openStockDetails = React.useCallback((symbol) => {
    setSelected(symbol);
    setDetailsOpen(true);
  }, []);

  const loadYahooCharts = React.useCallback(async (symbols, rangeLabel) => {
    if (!symbols.length) {
      setCharts({});
      setChartStatus("idle");
      return;
    }
    const rangeConfig = CHART_RANGES.find((item) => item.label === rangeLabel) || CHART_RANGES[2];
    setChartStatus("loading");
    try {
      const params = new URLSearchParams({
        symbols: symbols.join(","),
        range: rangeConfig.range,
        interval: rangeConfig.interval
      });
      const res = await fetch(`/api/stocks/chart?${params.toString()}`, { cache: "no-store" });
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

  const loadMonthlyMiniCharts = React.useCallback(async (symbols) => {
    if (!symbols.length) {
      setMiniCharts({});
      return;
    }
    try {
      const params = new URLSearchParams({
        symbols: symbols.join(","),
        range: "1mo",
        interval: "1d"
      });
      const res = await fetch(`/api/stocks/chart?${params.toString()}`, { cache: "no-store" });
      const payload = await readJsonResponse(res);
      const entries = (payload?.charts || [])
        .filter((chart) => chart.ok && chart.data?.length)
        .map((chart) => [chart.symbol, chart.data]);
      setMiniCharts(Object.fromEntries(entries));
    } catch (error) {
      console.warn("Yahoo mini chart API unavailable", error);
      setMiniCharts({});
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    function applyIntel(intel, nextBackend) {
      if (!intel) return;
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

    async function loadBackend() {
      const nextBackend = { health: false, intel: false, trade: false };
      setHermesProgress(HERMES_PROGRESS.sources);
      try {
        const healthRes = await fetch("/api/health");
        const health = await readJsonResponse(healthRes);
        if (cancelled) return;
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
        if (cancelled) return;
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
      setBackend(nextBackend);

      try {
        setHermesLoading(true);
        setHermesProgress(HERMES_PROGRESS.intel);
        const intelRes = await fetch("/api/robinhood/intel?compact=1");
        const intel = await readJsonResponse(intelRes);
        if (cancelled) return;
        if (intel) {
          applyIntel(intel, nextBackend);
          setHermesOutput(previewHermesOutput(intel));
          setBackend({ ...nextBackend });
        }

        setHermesProgress(HERMES_PROGRESS.model);
        const outputRes = await fetch("/api/hermes/output");
        const output = await readJsonResponse(outputRes);
        if (cancelled) return;
        const outputIntel = output?.data;
        if (output) setHermesOutput(output);
        applyIntel(outputIntel, nextBackend);
        setBackend({ ...nextBackend });
        setHermesProgress(HERMES_PROGRESS.ready);
      } catch (error) {
        console.warn("Stock intel unavailable", error);
        if (!cancelled) setHermesProgress(HERMES_PROGRESS.degraded);
      } finally {
        if (!cancelled) setHermesLoading(false);
      }
    }
    loadBackend();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    loadYahooCharts(stocks.map((item) => item.symbol), chartRange);
  }, [chartRange, loadYahooCharts, stocks]);

  React.useEffect(() => {
    if (!selected) return undefined;
    let cancelled = false;
    async function loadBacktest() {
      setBacktestStatus("loading");
      try {
        const res = await fetch(`/api/hermes/backtest?symbol=${encodeURIComponent(selected)}`);
        const payload = await readJsonResponse(res);
        if (cancelled) return;
        setBacktests((current) => ({ ...current, [selected]: payload }));
        setBacktestStatus(payload?.ok ? "ready" : "error");
      } catch (error) {
        console.warn("Hermes backtest unavailable", error);
        if (!cancelled) setBacktestStatus("error");
      }
    }
    loadBacktest();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  React.useEffect(() => {
    loadMonthlyMiniCharts(stocks.map((item) => item.symbol));
  }, [loadMonthlyMiniCharts, stocks]);

  React.useEffect(() => {
    setQuote(null);
    setQuoteTransactions([]);
    setTxHashes([]);
    setTradeStatus("");
    setTradeError("");
  }, [selected, payTokenSymbol, side, amount]);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (stored) setJournalEntries(JSON.parse(stored));
    } catch (error) {
      console.warn("Unable to load Hermes journal", error);
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journalEntries.slice(0, 50)));
    } catch (error) {
      console.warn("Unable to save Hermes journal", error);
    }
  }, [journalEntries]);

  function routePayload() {
    if (!stock || !payToken) return null;
    const isSell = side === "sell";
    return {
      action: side,
      source_asset: isSell ? stock.address : payToken.address,
      target_asset: isSell ? payToken.address : stock.address,
      amount: amount.trim(),
      wallet_address: wallet,
      provider: "auto",
      strategy: `Hermes Robinhood Chain ${side} route for ${stock.symbol}`
    };
  }

  function appendJournalEntry(status, extra = {}) {
    if (!stock) return;
    const { intel, decision } = getHermesContext(stock, hermesOutput);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      status,
      symbol: stock.symbol,
      side,
      amount: amount.trim(),
      sourceSymbol: sourceToken?.symbol,
      targetSymbol: targetToken?.symbol,
      wallet,
      hermesAction: decision?.action,
      hermesConfidence: decision?.confidence,
      sourceHealth: sourceHealthText(intel),
      degradedSources: intel?.pipeline?.degraded_sources || [],
      quoteSummary: extra.quote ? {
        ok: extra.quote.ok,
        message: extra.quote.message || extra.quote.error || null
      } : null,
      hashes: extra.hashes || []
    };
    setJournalEntries((current) => [entry, ...current].slice(0, 50));
  }

  async function connectWallet() {
    if (!isReownConfigured) {
      setTradeError("Set NEXT_PUBLIC_REOWN_PROJECT_ID before connecting a wallet.");
      return;
    }
    setTradeError("");
    await open({ view: "Connect", namespace: "eip155" });
  }

  async function switchToRobinhood() {
    setTradeError("");
    setTradeStatus("Requesting Robinhood Chain in wallet...");
    await switchNetwork(robinhoodChain);
  }

  async function executeQuoteTransactions() {
    if (!quoteTransactions.length) {
      setTradeError("Quote did not include an executable wallet transaction.");
      return;
    }
    setIsExecutingQuote(true);
    setTradeError("");
    setTxHashes([]);
    try {
      const hashes = [];
      for (const transaction of quoteTransactions) {
        setTradeStatus(`Waiting for wallet signature: ${transaction.label}`);
        const hash = await sendTransactionAsync({
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
          gas: transaction.gas,
          chainId: ROBINHOOD_CHAIN_ID
        });
        hashes.push(hash);
        setTxHashes([...hashes]);
        setTradeStatus(`Confirming ${transaction.label}...`);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      }
      setTradeStatus("Swap transaction confirmed on Robinhood Chain.");
      setQuoteTransactions([]);
      appendJournalEntry("tx_confirmed", { hashes });
    } catch (error) {
      setTradeError(error?.shortMessage || error?.message || "Wallet transaction failed.");
    } finally {
      setIsExecutingQuote(false);
    }
  }

  async function submitTrade(event) {
    event.preventDefault();
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (!connectedToRobinhood) {
      await switchToRobinhood();
      return;
    }
    if (quoteTransactions.length) {
      await executeQuoteTransactions();
      return;
    }
    if (!backend.trade) {
      setTradeError("Quote preparation is disabled until a provider with Robinhood Chain stock-token support is configured.");
      return;
    }

    const payload = routePayload();
    if (!payload) {
      setTradeError("Select a stock before preparing a quote.");
      return;
    }
    if (!payload.wallet_address || !payload.amount) {
      setTradeError("Connect wallet and enter an amount to prepare a quote.");
      return;
    }
    setIsPreparingQuote(true);
    setTradeError("");
    setTradeStatus("Preparing quote...");
    try {
      const res = await fetch("/api/robinhood/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const payload = await readJsonResponse(res);
      if (!res.ok || !payload) {
        setTradeError(`Quote request failed with status ${res.status}.`);
        return;
      }
      if (payload.ok === false) {
        setQuote(payload);
        setQuoteTransactions([]);
        setTradeError(payload.message || payload.error || "Quote request was rejected.");
        appendJournalEntry("quote_rejected", { quote: payload });
        return;
      }
      const transactions = extractTransactionRequests(payload);
      setQuote(payload);
      setQuoteTransactions(transactions);
      setTradeStatus(
        transactions.length
          ? `Quote ready. ${transactions.length === 1 ? "Sign the swap transaction" : `Sign ${transactions.length} wallet transactions`}.`
          : "Quote prepared, but the response did not include an executable wallet transaction."
      );
      appendJournalEntry(transactions.length ? "quote_ready" : "quote_prepared", { quote: payload });
    } catch (error) {
      setTradeError(`Quote request failed: ${error.message}`);
    } finally {
      setIsPreparingQuote(false);
    }
  }

  function submitLabel() {
    if (!isReownConfigured) return "Add Reown project ID";
    if (!isConnected) return "Connect wallet";
    if (!connectedToRobinhood) return "Switch to Robinhood";
    if (isPreparingQuote) return "Preparing quote";
    if (isExecutingQuote || walletPending) return "Waiting for wallet";
    if (quoteTransactions.length) return quoteTransactions.length === 1 ? "Sign swap" : `Sign ${quoteTransactions.length} txs`;
    if (!backend.trade) return "Quote provider unavailable";
    return "Prepare quote";
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
                    onClick={() => openStockDetails(item.symbol)}
                  >
                    <Logo stock={item} />
                    <span><strong>{item.symbol}</strong><span>{item.name}</span></span>
                    <MiniStockChart data={miniCharts[item.symbol] || []} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className={`workspace ${stock && detailsOpen ? "revealed" : ""}`}>
        <section className="control-stack">
          <form className="panel trade-ticket" onSubmit={submitTrade}>
            <div className="swap-shell">
              <div className="swap-toolbar">
                <div className="swap-tabs" aria-label="Trade side">
                  <button className={side === "buy" ? "active" : ""} type="button" onClick={() => setSide("buy")}>Buy</button>
                  <button className={side === "sell" ? "active sell" : ""} type="button" onClick={() => setSide("sell")}>Sell</button>
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
                <div className="wallet-row wallet-connect-row">
                  {isConnected ? (
                    <div className="wallet-actions">
                      <button className="wallet-address-button" type="button" onClick={() => open({ view: "Account" })}>
                        {shortenAddress(wallet)}
                      </button>
                      <button className="wallet-link-button" type="button" onClick={() => disconnect()}>
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button className="wallet-address-button connect-wallet-button" type="button" onClick={connectWallet}>
                      Connect
                    </button>
                  )}
                </div>
                {isConnected && (
                  <div className={`network-row ${connectedToRobinhood ? "ready" : ""}`}>
                    <span>{connectedToRobinhood ? "Robinhood Chain" : "Wrong network"}</span>
                    {!connectedToRobinhood && (
                      <button type="button" onClick={switchToRobinhood}>
                        Switch
                      </button>
                    )}
                  </div>
                )}
                {(tradeStatus || tradeError || txHashes.length > 0 || quote) && (
                  <div className={`quote-status ${tradeError ? "error" : ""}`}>
                    {tradeError || tradeStatus}
                    {txHashes.length > 0 && (
                      <div className="tx-links">
                        {txHashes.map((hash) => (
                          <a key={hash} href={`${ROBINHOOD_CHAIN_EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
                            {shortenAddress(hash)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isConnected ? (
                <button className="swap-submit" type="submit" disabled={tradeBusy || !isReownConfigured}>
                  <MotionAsset src="/media/icons/wallet-connect-orb.mp4" webmSrc="/media/icons/wallet-connect-orb.webm" className="submit-motion" />
                  <span>{submitLabel()}</span>
                </button>
              ) : null}
              <p className="powered-by-chain">Powered by <span>Robinhood Chain</span></p>
            </div>
          </form>

          <section className="panel stock-section">
            <div className="stocks-grid">
              {stocks.map((item) => (
                <article className={`stock-card ${item.symbol === selected ? "active" : ""}`} key={item.symbol}>
                  <button
                    className="stock-select"
                    type="button"
                    onClick={() => openStockDetails(item.symbol)}
                  >
                    <div className="stock-top">
                      <Logo stock={item} />
                      <div className="ticker">{item.symbol}</div>
                    </div>
                    <MiniStockChart data={miniCharts[item.symbol] || []} />
                  </button>
                </article>
              ))}
            </div>
          </section>
          <EarningsCalendar
            events={earningsEvents}
            stocks={stocks}
            monthDate={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelectStock={openStockDetails}
          />
        </section>

        {stock && detailsOpen && (
          <section className="panel research-panel" aria-label="Selected stock research">
              <div className="research-heading">
              <div className="research-title">
                <Logo stock={stock} />
                <div>
                  <h2>{stock.symbol}</h2>
                </div>
              </div>
              <ChartRangeControls selectedRange={chartRange} onRangeChange={setChartRange} />
              <button className="mobile-detail-close" type="button" aria-label="Close selected stock research" onClick={() => setDetailsOpen(false)}>
                <XIcon />
              </button>
              </div>
            <div className="detail-stack">
              <StockChartView
                data={selectedChartData}
                ticker={stock.symbol}
                status={chartStatus}
                selectedRange={chartRange}
              />
              <HermesOutputBar stock={stock} hermesOutput={hermesOutput} loading={hermesLoading} progress={hermesProgress} />
              <ConfidenceDecomposition stock={stock} hermesOutput={hermesOutput} />
              <HermesReasoningGraph stock={stock} hermesOutput={hermesOutput} loading={hermesLoading} />
              <EarningsBacktestTable stock={stock} backtest={backtests[stock.symbol]} loading={backtestStatus === "loading" && !backtests[stock.symbol]} />
              <PredictionMarketOverlay stock={stock} hermesOutput={hermesOutput} />
              <DataProvenanceView hermesOutput={hermesOutput} />
              <PostTradeJournal entries={journalEntries} stock={stock} />
            </div>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <a href="https://github.com/LifeAnalysis" target="_blank" rel="noreferrer">
          <GithubIcon />
          <span>Built by LifeAnalysis</span>
        </a>
        <span>
          <SparklesIcon />
          Built using Hermes, custom model, Robinhood Chain, and Kalshi data feed
        </span>
        <a href="https://twitter.com/kuerax" target="_blank" rel="noreferrer">
          <SparklesIcon />
          <span>@kuerax on Twitter</span>
        </a>
      </footer>
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
