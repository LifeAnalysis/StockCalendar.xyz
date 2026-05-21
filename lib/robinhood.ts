import { env, intEnv } from "./env";
import { fetchJson } from "./http";

export const ROBINHOOD_CHAIN_ID = 46630;
export const ROBINHOOD_CHAIN_NAME = "Robinhood Chain Testnet";
export const ROBINHOOD_EXPLORER = "https://explorer.testnet.chain.robinhood.com";

export type RobinhoodToken = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  chainId: number;
  aliases: string[];
  kind: "stock" | "payment";
  secCik?: string;
  logoUrl?: string;
  brandColor?: string;
};

export type ExplorerStockToken = {
  symbol: string;
  name: string;
  address: string;
  token_type: string;
  is_verified: boolean;
  total_supply?: string | null;
  token_url?: string;
  trust_level: "official" | "protocol_wrapper" | "third_party_or_mock";
  routed_by_agent: boolean;
};

export const robinhoodPaymentTokens: RobinhoodToken[] = [
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x7943e237c7F95DA44E0301572D358911207852Fa",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["weth", "wrapped ether"],
    kind: "payment",
    logoUrl: "https://assets.coingecko.com/coins/images/2518/large/weth.png",
    brandColor: "#627eea"
  },
  {
    symbol: "USDG",
    name: "USDG",
    address: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["usdg", "test usd"],
    kind: "payment",
    logoUrl: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
    brandColor: "#2775ca"
  }
];

export const robinhoodStockTokens: RobinhoodToken[] = [
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["tesla", "tesla stock", "tsla"],
    kind: "stock",
    secCik: "0001318605",
    logoUrl: "https://logo.clearbit.com/tesla.com",
    brandColor: "#e82127"
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    address: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["amazon", "amazon stock", "amzn"],
    kind: "stock",
    secCik: "0001018724",
    logoUrl: "https://logo.clearbit.com/amazon.com",
    brandColor: "#ff9900"
  },
  {
    symbol: "PLTR",
    name: "Palantir",
    address: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["palantir", "palantir stock", "pltr"],
    kind: "stock",
    secCik: "0001321655",
    logoUrl: "https://logo.clearbit.com/palantir.com",
    brandColor: "#d8d8d8"
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["netflix", "netflix stock", "nflx"],
    kind: "stock",
    secCik: "0001065280",
    logoUrl: "https://logo.clearbit.com/netflix.com",
    brandColor: "#e50914"
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    address: "0x71178BAc73cBeb415514eB542a8995b82669778d",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["advanced micro devices", "amd stock", "amd"],
    kind: "stock",
    secCik: "0000002488",
    logoUrl: "https://logo.clearbit.com/amd.com",
    brandColor: "#ed1c24"
  }
];

export function robinhoodRpcUrl(): string {
  return env("ROBINHOOD_CHAIN_RPC_URL");
}

export function robinhoodChainId(): number {
  return intEnv("ROBINHOOD_CHAIN_ID", ROBINHOOD_CHAIN_ID);
}

export function robinhoodExplorer(): string {
  return env("ROBINHOOD_CHAIN_EXPLORER_URL", ROBINHOOD_EXPLORER).replace(/\/$/, "");
}

const stockSearchTerms = ["stock", ...robinhoodStockTokens.map((stock) => stock.symbol), "AAPL", "GOOG", "MSFT", "NVDA", "META"];

function classifyExplorerToken(item: {
  address_hash?: string;
  name?: string;
  symbol?: string;
  token_type?: string;
  is_smart_contract_verified?: boolean;
  token_url?: string;
  total_supply?: string | null;
}): ExplorerStockToken | null {
  const symbol = (item.symbol || "").trim();
  const name = (item.name || "").trim();
  const address = (item.address_hash || "").trim();
  const tokenType = (item.token_type || "").trim();
  if (!symbol || !name || !address || tokenType !== "ERC-20") return null;

  const official = robinhoodStockTokens.find((stock) => stock.address.toLowerCase() === address.toLowerCase());
  const stockLike =
    official ||
    /\bstock\b/i.test(name) ||
    /\b(aapl|goog|googl|msft|nvda|meta|tsla|amzn|amd|nflx|pltr)\b/i.test(symbol) ||
    /\b(aapl|goog|googl|msft|nvda|meta|tsla|amzn|amd|nflx|pltr)\b/i.test(name);
  if (!stockLike) return null;

  const protocolWrapper = /\b(aave|edel|debt|astk|variabledebt)\b/i.test(`${name} ${symbol}`);

  return {
    symbol,
    name,
    address,
    token_type: tokenType,
    is_verified: Boolean(item.is_smart_contract_verified),
    total_supply: item.total_supply,
    token_url: item.token_url ? `${robinhoodExplorer()}${item.token_url}` : undefined,
    trust_level: official ? "official" : protocolWrapper ? "protocol_wrapper" : "third_party_or_mock",
    routed_by_agent: Boolean(official)
  };
}

export async function discoverExplorerStockTokens() {
  const source = `${robinhoodExplorer()}/api/v2/search`;
  const results = await Promise.all(
    stockSearchTerms.map((term) => fetchJson<{ items?: unknown[] }>(`${source}?q=${encodeURIComponent(term)}`, { timeoutMs: 8000 }))
  );
  const byAddress = new Map<string, ExplorerStockToken>();
  const errors: string[] = [];

  for (const result of results) {
    if (!result.ok) errors.push(result.error || `status ${result.status}`);
    for (const item of result.data?.items || []) {
      if (!item || typeof item !== "object") continue;
      const token = classifyExplorerToken(item as Parameters<typeof classifyExplorerToken>[0]);
      if (token) byAddress.set(token.address.toLowerCase(), token);
    }
  }

  const tokens = Array.from(byAddress.values()).sort((a, b) => {
    const trustOrder = { official: 0, third_party_or_mock: 1, protocol_wrapper: 2 };
    return trustOrder[a.trust_level] - trustOrder[b.trust_level] || a.symbol.localeCompare(b.symbol) || a.name.localeCompare(b.name);
  });

  return {
    ok: errors.length < results.length,
    source,
    searched_terms: stockSearchTerms,
    stock_like_count: tokens.length,
    official_count: tokens.filter((token) => token.trust_level === "official").length,
    other_count: tokens.filter((token) => token.trust_level !== "official").length,
    tokens,
    error: errors.join("; ") || undefined
  };
}

export async function robinhoodStatus() {
  const rpcUrl = robinhoodRpcUrl();
  const chainId = robinhoodChainId();
  if (!rpcUrl) {
    return {
      ok: false,
      needs_configuration: "ROBINHOOD_CHAIN_RPC_URL",
      chain: { name: ROBINHOOD_CHAIN_NAME, chainId, explorer: robinhoodExplorer(), rpc_configured: false }
    };
  }

  const chain = await fetchJson<{ result?: string; error?: unknown }>(rpcUrl, {
    method: "POST",
    body: { id: 1, jsonrpc: "2.0", method: "eth_chainId", params: [] }
  });
  const block = await fetchJson<{ result?: string; error?: unknown }>(rpcUrl, {
    method: "POST",
    body: { id: 1, jsonrpc: "2.0", method: "eth_blockNumber", params: [] }
  });
  const observedChainId = chain.data?.result ? Number.parseInt(chain.data.result, 16) : null;
  const latestBlock = block.data?.result ? Number.parseInt(block.data.result, 16) : null;

  return {
    ok: chain.ok && observedChainId === chainId,
    source: "Robinhood Chain RPC",
    chain: { name: ROBINHOOD_CHAIN_NAME, chainId, observedChainId, explorer: robinhoodExplorer(), rpc_configured: true },
    latestBlock,
    raw: { eth_chainId: chain.data?.result || null, eth_blockNumber: block.data?.result || null }
  };
}

export type StockTradeInput = {
  action: "buy" | "sell" | "swap" | "rotate";
  source_asset: string;
  target_asset: string;
  amount: string;
  wallet_address: string;
  provider?: "auto" | "nuvolari";
  slippagePercentage?: number;
  strategy?: string;
};

function looksAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

export async function prepareStockTrade(input: StockTradeInput) {
  const chainId = robinhoodChainId();
  const payload = {
    srcTokenAddress: input.source_asset,
    destTokenAddress: input.target_asset,
    srcChainId: chainId,
    destChainId: chainId,
    userAddress: input.wallet_address,
    amount: input.amount,
    slippagePercentage: input.slippagePercentage ?? 0.5
  };

  if (!looksAddress(input.source_asset) || !looksAddress(input.target_asset) || !looksAddress(input.wallet_address) || !input.amount) {
    return {
      ok: false,
      needs_input: ["source_asset", "target_asset", "wallet_address", "amount"],
      message: "Use exact on-chain token contracts. Symbols are not enough for Robinhood Chain stock trades.",
      received: payload,
      stock_universe: robinhoodStockTokens
    };
  }

  const status = await robinhoodStatus();
  if (!status.ok) {
    return { ok: false, needs_configuration: "ROBINHOOD_CHAIN_RPC_URL", chain_status: status, intended_request: payload };
  }

  const baseUrl = env("NUVOLARI_API_BASE_URL", "https://api.staging.nuvolari.ai");
  const path = env("NUVOLARI_EXECUTION_QUOTE_PATH", "/v1/execution/quote");
  const result = await fetchJson(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      ...(env("NUVOLARI_API_KEY") ? { "x-api-key": env("NUVOLARI_API_KEY") } : {}),
      ...(env("NUVOLARI_SECRET_API_KEY") ? { Authorization: `Bearer ${env("NUVOLARI_SECRET_API_KEY")}` } : {})
    },
    body: payload
  });
  return { ...result, provider: "nuvolari", action: input.action, atomic: true, strategy: input.strategy || "", execution_boundary: "wallet_signature_required" };
}
