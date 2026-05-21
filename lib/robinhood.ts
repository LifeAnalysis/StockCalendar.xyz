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
};

export const robinhoodPaymentTokens: RobinhoodToken[] = [
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x7943e237c7F95DA44E0301572D358911207852Fa",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["weth", "wrapped ether"],
    kind: "payment"
  },
  {
    symbol: "USDG",
    name: "USDG",
    address: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["usdg", "test usd"],
    kind: "payment"
  }
];

export const robinhoodStockTokens: RobinhoodToken[] = [
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["tesla", "tesla stock", "tsla"],
    kind: "stock"
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    address: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["amazon", "amazon stock", "amzn"],
    kind: "stock"
  },
  {
    symbol: "PLTR",
    name: "Palantir",
    address: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["palantir", "palantir stock", "pltr"],
    kind: "stock"
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["netflix", "netflix stock", "nflx"],
    kind: "stock"
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    address: "0x71178BAc73cBeb415514eB542a8995b82669778d",
    chainId: ROBINHOOD_CHAIN_ID,
    aliases: ["advanced micro devices", "amd stock", "amd"],
    kind: "stock"
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
  provider?: "auto" | "nuvolari" | "arqsy";
  slippagePercentage?: number;
  strategy?: string;
};

function looksAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

export async function prepareStockTrade(input: StockTradeInput) {
  const chainId = robinhoodChainId();
  const provider = input.provider || "auto";
  const selectedProvider = provider === "auto" ? (env("ROBINHOOD_STOCK_PROVIDER", "nuvolari") as "nuvolari" | "arqsy") : provider;
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

  if (selectedProvider === "arqsy") {
    const baseUrl = env("ARQSY_API_BASE_URL");
    if (!baseUrl) {
      return { ok: false, needs_configuration: "ARQSY_API_BASE_URL", intended_request: payload };
    }
    const path = env("ARQSY_STOCK_TRADE_PATH", "/v1/stocks/trade");
    const result = await fetchJson(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
      method: "POST",
      headers: env("ARQSY_API_KEY") ? { Authorization: `Bearer ${env("ARQSY_API_KEY")}` } : {},
      body: payload
    });
    return { ...result, provider: "arqsy", action: input.action, atomic: true, execution_boundary: "wallet_signature_required" };
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
