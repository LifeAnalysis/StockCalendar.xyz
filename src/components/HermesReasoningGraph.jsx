"use client";

import cytoscape from "cytoscape";
import * as React from "react";

const NODE_TYPES = {
  decision: { label: "Decision", color: "#04151f", text: "#ffffff" },
  route: { label: "Route", color: "#245f73", text: "#ffffff" },
  source: { label: "Source", color: "#f6f6f2", text: "#202621" },
  signal: { label: "Signal", color: "#ccff00", text: "#202621" },
  risk: { label: "Risk", color: "#b94134", text: "#ffffff" },
  missing: { label: "Missing", color: "#f0dfaa", text: "#202621" }
};

function compactText(value, fallback = "n/a") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.length > 150 ? `${text.slice(0, 147)}...` : text;
}

function formatReadableDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return String(value);
  const monthName = date.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  return `${Number(day)} ${monthName} ${year}`;
}

function formatEvidenceText(value) {
  return String(value || "").replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match) => formatReadableDate(match));
}

function firstUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function kalshiMarketUrl(market) {
  const ticker = market?.ticker || market?.event_ticker;
  return ticker ? `https://kalshi.com/markets/${encodeURIComponent(ticker)}` : null;
}

function nodeDimensions(node) {
  const label = String(node.label || "");
  const width = Math.max(118, Math.min(168, label.length * 6.5 + 30));
  const height = node.type === "decision" ? 60 : label.length > 22 ? 56 : 48;
  return { width, height };
}

function describeNode(node) {
  if (!node) return "";
  if (node.description) return node.description;
  const label = node.label || "This node";
  const descriptions = {
    decision: `${label} is Hermes' current stance for the selected stock. It combines route readiness with public quote, filing, calendar, Kalshi, and source-health evidence.`,
    route: `${label} confirms whether the selected stock has an official Robinhood Chain contract that Hermes is allowed to route against.`,
    source: `${label} is an external evidence source. Hermes uses it as supporting context, not as permission to execute a trade.`,
    signal: `${label} is an interpreted signal derived from source data. It can improve timing or confidence, but it still depends on clean route and source checks.`,
    risk: `${label} marks degraded or missing context that should lower confidence until the source recovers.`,
    missing: `${label} shows evidence Hermes expected but could not cleanly load for this stock.`
  };
  return descriptions[node.type] || descriptions.source;
}

function NodeDetailPanel({ node }) {
  const detailPoints = splitDetail(node?.detail);
  return (
    <aside className="reasoning-node-panel" aria-live="polite" aria-label="Selected evidence node details">
      <span>{node?.typeLabel || "Evidence"}</span>
      <strong>{node?.label || "Select a node"}</strong>
      <p>{formatEvidenceText(describeNode(node))}</p>
      {detailPoints.length ? (
        <div className="reasoning-node-detail-list">
          {detailPoints.map((point) => (
            <p key={point}>{formatEvidenceText(point)}</p>
          ))}
        </div>
      ) : null}
      {node?.href ? (
        <a className="reasoning-source-link" href={node.href} target="_blank" rel="noreferrer">
          Source
        </a>
      ) : null}
    </aside>
  );
}

function splitDetail(value) {
  const text = formatEvidenceText(value).trim();
  if (!text) return [];
  return text
    .split(/(?: · |;\s+|\.\s+)/)
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 4);
}

function RotateCcwIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7"></path>
      <path d="M3 3v6h6"></path>
    </svg>
  );
}

function addNode(nodes, node) {
  if (!node?.id || nodes.some((item) => item.data.id === node.id)) return;
  const meta = NODE_TYPES[node.type] || NODE_TYPES.source;
  const dimensions = nodeDimensions(node);
  nodes.push({
    data: {
      ...node,
      typeLabel: meta.label,
      color: meta.color,
      textColor: meta.text,
      weight: node.weight || (node.type === "decision" ? 46 : node.type === "source" ? 28 : 34),
      width: node.width || dimensions.width,
      height: node.height || dimensions.height
    }
  });
}

function addEdge(edges, source, target, label, polarity = "neutral") {
  if (!source || !target) return;
  edges.push({
    data: {
      id: `${source}->${target}:${label}`,
      source,
      target,
      label,
      polarity
    }
  });
}

function positionGraphNodes(nodes) {
  const peripheralNodes = nodes.filter((node) => node.data.id !== "decision");
  const compactSlots = [
    { x: 0, y: -104 },
    { x: 168, y: -60 },
    { x: 168, y: 60 },
    { x: 0, y: 104 },
    { x: -168, y: 60 },
    { x: -168, y: -60 },
    { x: 86, y: -104 },
    { x: -86, y: 104 },
    { x: 86, y: 104 },
    { x: -86, y: -104 }
  ];

  return nodes.map((node) => {
    if (node.data.id === "decision") {
      return { ...node, position: { x: 0, y: 0 } };
    }

    const nodeIndex = peripheralNodes.findIndex((item) => item.data.id === node.data.id);
    const slot = compactSlots[nodeIndex];
    if (slot) return { ...node, position: slot };

    const angle = -Math.PI / 2 + (nodeIndex / Math.max(peripheralNodes.length, 1)) * Math.PI * 2;
    return {
      ...node,
      position: {
        x: Math.cos(angle) * 168,
        y: Math.sin(angle) * 104
      }
    };
  });
}

function layoutGraphInViewport(cy) {
  const nodes = cy.nodes();
  if (!nodes.length) return;

  const width = Math.max(cy.width(), 320);
  const height = Math.max(cy.height(), 280);
  const center = { x: width / 2, y: height / 2 };
  const maxNodeWidth = Math.max(...nodes.map((node) => Number(node.data("width") || 140)));
  const maxNodeHeight = Math.max(...nodes.map((node) => Number(node.data("height") || 56)));
  const radiusX = Math.max(80, Math.min(220, (width - maxNodeWidth - 96) / 2));
  const radiusY = Math.max(62, Math.min(124, (height - maxNodeHeight - 96) / 2));
  const peripheralNodes = nodes.filter((node) => node.id() !== "decision");
  const slotAngles = [-90, -30, 30, 90, 150, -150, -62, 118, 62, -118];

  cy.batch(() => {
    cy.zoom(1);
    cy.pan({ x: 0, y: 0 });
    const decisionNode = cy.getElementById("decision");
    if (decisionNode.length) decisionNode.position(center);

    peripheralNodes.forEach((node, index) => {
      const angle = ((slotAngles[index] ?? -90 + (360 / Math.max(peripheralNodes.length, 1)) * index) * Math.PI) / 180;
      node.position({
        x: center.x + Math.cos(angle) * radiusX,
        y: center.y + Math.sin(angle) * radiusY
      });
    });
  });
}

function buildGraph(stock, hermesOutput, loading) {
  const intel = hermesOutput?.data;
  const decision = (hermesOutput?.hermes_decision?.stocks || intel?.hermes_decision?.stocks || []).find((item) => item.symbol === stock?.symbol);
  const recommendation = (intel?.recommendations || []).find((item) => item.symbol === stock?.symbol);
  const calendar = (intel?.calendars || []).find((item) => item.symbol === stock?.symbol);
  const price = (intel?.stock_signals?.prices || []).find((item) => item.symbol === stock?.symbol);
  const filing = (intel?.stock_signals?.filings || []).find((item) => item.symbol === stock?.symbol);
  const news = (intel?.stock_signals?.news || []).find((item) => item.symbol === stock?.symbol);
  const kalshi = (intel?.kalshi?.stocks || []).find((item) => item.stock?.symbol === stock?.symbol);
  const topMarket = kalshi?.markets?.[0];
  const explorerToken = (intel?.explorer_discovery?.tokens || []).find(
    (token) => token.routed_by_agent && token.address?.toLowerCase() === stock?.address?.toLowerCase()
  );
  const degradedSources = intel?.pipeline?.degraded_sources || [];
  const nodes = [];
  const edges = [];

  addNode(nodes, {
    id: "decision",
    type: "decision",
    label: `${decision?.action || (loading ? "RUNNING" : "WATCH")} ${stock?.symbol || ""}`.trim(),
    detail: decision?.reason || recommendation?.rationale || "Hermes is assembling source evidence for this stock route.",
    weight: 56
  });
  addNode(nodes, {
    id: "route",
    type: stock?.address ? "route" : "missing",
    label: stock?.address ? "Official token route" : "Missing route",
    detail: stock?.address ? `${stock.symbol} contract ${stock.address}` : "No official Robinhood Chain stock token contract is selected.",
    href: stock?.address ? `https://explorer.testnet.chain.robinhood.com/address/${stock.address}` : null
  });
  addEdge(edges, "route", "decision", stock?.address ? "enables" : "blocks", stock?.address ? "positive" : "negative");

  if (price?.ok) {
    addNode(nodes, {
      id: "price",
      type: "source",
      label: "Public quote",
      detail: `${price.source || "stock quote"} · close ${price.close ?? "n/a"}${price.date ? ` · ${formatReadableDate(price.date)}` : ""}`,
      href: "https://stooq.com/q/l/"
    });
    addEdge(edges, "price", "decision", "prices", "positive");
  } else {
    addNode(nodes, {
      id: "price-missing",
      type: "missing",
      label: "Quote degraded",
      detail: price?.error || "No clean public quote snapshot is available."
    });
    addEdge(edges, "price-missing", "decision", "weakens", "negative");
  }

  if (topMarket) {
    addNode(nodes, {
      id: "kalshi",
      type: "source",
      label: "Kalshi market",
      detail: compactText(topMarket.title || topMarket.series_title || topMarket.ticker),
      href: kalshiMarketUrl(topMarket)
    });
    addEdge(edges, "kalshi", "decision", "supports context", "positive");
  } else {
    addNode(nodes, {
      id: "kalshi-missing",
      type: "missing",
      label: "No clean Kalshi match",
      detail: "Hermes did not find a machine-readable Kalshi market cleanly tied to this symbol."
    });
    addEdge(edges, "kalshi-missing", "decision", "limits confidence", "negative");
  }

  if (filing?.latest_material) {
    addNode(nodes, {
      id: "sec",
      type: "source",
      label: `SEC ${filing.latest_material.form}`,
      detail: compactText(filing.latest_material.description || filing.latest_material.document_url || filing.source),
      href: filing.latest_material.document_url || firstUrl(filing.source)
    });
    addEdge(edges, "sec", "decision", "updates risk", "neutral");
  }

  if (news?.article_count) {
    addNode(nodes, {
      id: "news",
      type: "source",
      label: `${news.article_count} news item(s)`,
      detail: compactText(news.top_articles?.[0]?.title || news.source),
      href: news.top_articles?.[0]?.url
    });
    addEdge(edges, "news", "decision", "sentiment context", "neutral");
  }

  if (calendar?.ok || calendar?.earnings_dates?.length) {
    addNode(nodes, {
      id: "calendar",
      type: "signal",
      label: "Earnings window",
      detail: calendar?.earnings_dates?.length ? `Next date: ${formatReadableDate(calendar.earnings_dates[0])}` : "Calendar fallback links are available.",
      href: calendar?.public_links?.[0]
    });
    addEdge(edges, "calendar", "decision", "event timing", "neutral");
  }

  if (explorerToken) {
    addNode(nodes, {
      id: "explorer",
      type: "source",
      label: "Explorer confirmed",
      detail: `${explorerToken.symbol} · ${explorerToken.trust_level}`,
      href: explorerToken.token_url
    });
    addEdge(edges, "explorer", "route", "verifies", "positive");
  }

  if (recommendation?.evidence?.market_pricing) {
    const pricing = recommendation.evidence.market_pricing;
    addNode(nodes, {
      id: "probability",
      type: "signal",
      label: "Market pricing",
      detail: `YES ${pricing.yes_bid || "n/a"} / ${pricing.yes_ask || "n/a"} · ${pricing.spread_note || "spread unavailable"}`
    });
    addEdge(edges, "kalshi", "probability", "implies", "positive");
    addEdge(edges, "probability", "decision", "prices event", "neutral");
  }

  degradedSources.slice(0, 4).forEach((name) => {
    const id = `degraded-${name}`;
    addNode(nodes, {
      id,
      type: "risk",
      label: name.replaceAll("_", " "),
      detail: "This data source is degraded in the current Hermes payload."
    });
    addEdge(edges, id, "decision", "degrades", "negative");
  });

  if (!nodes.length) {
    addNode(nodes, {
      id: "empty",
      type: "missing",
      label: "No evidence yet",
      detail: "Hermes has not loaded an intel payload."
    });
  }

  return { nodes: positionGraphNodes(nodes), edges, selected: nodes.find((node) => node.data.id === "decision")?.data || nodes[0]?.data };
}

export function HermesReasoningGraph({ stock, hermesOutput, loading }) {
  const containerRef = React.useRef(null);
  const cyRef = React.useRef(null);
  const graph = React.useMemo(() => buildGraph(stock, hermesOutput, loading), [stock, hermesOutput, loading]);
  const [selectedNode, setSelectedNode] = React.useState(graph.selected);

  React.useEffect(() => {
    setSelectedNode(graph.selected);
  }, [graph]);

  React.useEffect(() => {
    if (!containerRef.current) return undefined;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graph.nodes, ...graph.edges],
      autoungrabify: false,
      boxSelectionEnabled: false,
      maxZoom: 1.25,
      minZoom: 0.04,
      userPanningEnabled: false,
      userZoomingEnabled: false,
      zoom: 1,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            "border-color": "#202621",
            "border-width": 1,
            color: "data(textColor)",
            content: "data(label)",
            "font-family": "Helvetica, Arial, sans-serif",
            "font-size": 12,
            "font-weight": 500,
            height: "data(height)",
            "min-zoomed-font-size": 6,
            "overlay-opacity": 0,
            shape: "rectangle",
            "text-halign": "center",
            "text-margin-x": 0,
            "text-margin-y": 0,
            "text-max-width": 148,
            "text-valign": "center",
            "text-wrap": "wrap",
            width: "data(width)"
          }
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#ccff00",
            "border-width": 3
          }
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "font-size": 11,
            "font-weight": 500,
            "label": "data(label)",
            "line-color": "#8e9690",
            "target-arrow-color": "#8e9690",
            "target-arrow-shape": "triangle",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": 4,
            "text-rotation": "autorotate",
            width: 1.4
          }
        },
        {
          selector: 'edge[polarity = "positive"]',
          style: {
            "line-color": "#1f7a53",
            "target-arrow-color": "#1f7a53"
          }
        },
        {
          selector: 'edge[polarity = "negative"]',
          style: {
            "line-color": "#b94134",
            "line-style": "dashed",
            "target-arrow-color": "#b94134"
          }
        }
      ],
      layout: {
        name: "preset",
        animate: false,
        fit: false
      }
    });

    const centerGraph = () => {
      cy.resize();
      layoutGraphInViewport(cy);
    };
    const initialNode = cy.getElementById(graph.selected?.id || "decision");
    if (initialNode.length) initialNode.select();
    cy.on("layoutstop", centerGraph);
    cy.ready(centerGraph);
    cy.on("tap", "node", (event) => {
      const data = event.target.data();
      setSelectedNode(data);
      event.target.select();
    });
    cy.on("tap", (event) => {
      if (event.target === cy) {
        const decisionNode = cy.getElementById("decision");
        if (decisionNode.length) {
          decisionNode.select();
          setSelectedNode(decisionNode.data());
        }
      }
    });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => window.requestAnimationFrame(centerGraph)) : null;
    if (resizeObserver) resizeObserver.observe(containerRef.current);

    cyRef.current = cy;
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  const resetGraph = React.useCallback(() => {
    if (!cyRef.current) return;
    layoutGraphInViewport(cyRef.current);
  }, []);

  return (
    <section className="hermes-module reasoning-graph-module" aria-label="Hermes evidence graph">
      <div className="module-head reasoning-graph-head">
        <div>
          <h3>Hermes Evidence Map</h3>
        </div>
        <button className="graph-reset-button" type="button" onClick={resetGraph}>
          <RotateCcwIcon />
          Reset
        </button>
      </div>
      <div className="reasoning-graph-layout">
        <div className="reasoning-graph-canvas" ref={containerRef} role="img" aria-label="Linked Hermes sources and decision evidence"></div>
        <NodeDetailPanel node={selectedNode} />
      </div>
      <div className="reasoning-graph-legend" aria-label="Evidence graph legend">
        {Object.entries(NODE_TYPES).map(([key, value]) => (
          <span key={key}>
            <i style={{ backgroundColor: value.color }}></i>
            {value.label}
          </span>
        ))}
      </div>
    </section>
  );
}
