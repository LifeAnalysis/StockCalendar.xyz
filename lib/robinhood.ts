import { env, intEnv } from "./env";
import { fetchJson } from "./http";
import { decodeFunctionResult, encodeFunctionData, parseUnits, type Abi } from "viem";

export const ROBINHOOD_CHAIN_ID = 46630;
export const ROBINHOOD_CHAIN_NAME = "Robinhood Chain Testnet";
export const ROBINHOOD_EXPLORER = "https://explorer.testnet.chain.robinhood.com";
export const ROBINHOOD_PUBLIC_RPC = "https://rpc.testnet.chain.robinhood.com";
export const RH_SWAP_FACTORY = "0xE9a696F428725134AB06454A0CB2E7434e3deC4c";
export const HOBIN_FACTORY = "0xdD427A5AdF55C1ad4e82E6Af8C0Baaab0A2b5515";
export const HOBIN_ROUTER = "0xF957Cb7a67180bf70Ca46C7c88F6c2b3Cb9c33B4";

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
  return env("ROBINHOOD_CHAIN_RPC_URL", env("NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL", ROBINHOOD_PUBLIC_RPC));
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

export function stockQuoteProviderStatus() {
  const rpcUrl = robinhoodRpcUrl();
  const hobinFactory = env("HOBIN_FACTORY_ADDRESS", HOBIN_FACTORY);
  const hobinRouter = env("HOBIN_ROUTER_ADDRESS", HOBIN_ROUTER);
  const swapFactory = env("ROBINHOOD_SWAP_FACTORY_ADDRESS", RH_SWAP_FACTORY);
  const configured = Boolean(rpcUrl && hobinFactory && hobinRouter);

  return {
    configured,
    provider: configured ? "hobin" : null,
    fallback_provider: rpcUrl && swapFactory ? "rh_swap" : null,
    needs_configuration: [rpcUrl ? "" : "ROBINHOOD_CHAIN_RPC_URL", hobinFactory ? "" : "HOBIN_FACTORY_ADDRESS", hobinRouter ? "" : "HOBIN_ROUTER_ADDRESS"].filter(Boolean),
    auth_configured: true,
    factory: hobinFactory,
    router: hobinRouter,
    fallback_factory: swapFactory
  };
}

export type StockTradeInput = {
  action: "buy" | "sell" | "swap" | "rotate";
  source_asset: string;
  target_asset: string;
  amount: string;
  wallet_address: string;
  provider?: "auto";
  slippagePercentage?: number;
  strategy?: string;
};

function looksAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function buildQuotePayload(input: StockTradeInput) {
  const chainId = robinhoodChainId();
  return {
    chainId,
    srcChainId: chainId,
    destChainId: chainId,
    sourceChainId: chainId,
    targetChainId: chainId,
    srcTokenAddress: input.source_asset,
    destTokenAddress: input.target_asset,
    source_asset: input.source_asset,
    target_asset: input.target_asset,
    fromTokenAddress: input.source_asset,
    toTokenAddress: input.target_asset,
    userAddress: input.wallet_address,
    wallet_address: input.wallet_address,
    takerAddress: input.wallet_address,
    amount: input.amount,
    sellAmount: input.amount,
    slippagePercentage: input.slippagePercentage ?? 0.5,
    action: input.action,
    strategy: input.strategy || `Hermes Robinhood Chain ${input.action} quote`
  };
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const UINT256_MAX = (1n << 256n) - 1n;

const factoryAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [{ type: "address", name: "token" }],
    outputs: [{ type: "address" }]
  }
] as const;

const pairAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "_reserveEth" }, { type: "uint256", name: "_reserveToken" }]
  },
  {
    type: "function",
    name: "quoteEthForTokens",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "ethIn" }],
    outputs: [{ type: "uint256", name: "tokensOut" }]
  },
  {
    type: "function",
    name: "quoteTokensForEth",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "tokensIn" }],
    outputs: [{ type: "uint256", name: "ethOut" }]
  },
  {
    type: "function",
    name: "swapEthForTokens",
    stateMutability: "payable",
    inputs: [{ type: "uint256", name: "minTokensOut" }, { type: "address", name: "to" }],
    outputs: [{ type: "uint256", name: "tokensOut" }]
  },
  {
    type: "function",
    name: "swapTokensForEth",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "tokensIn" }, { type: "uint256", name: "minEthOut" }, { type: "address", name: "to" }],
    outputs: [{ type: "uint256", name: "ethOut" }]
  }
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ type: "address", name: "spender" }, { type: "uint256", name: "value" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }]
  }
] as const;

const hobinFactoryAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [{ type: "address", name: "tokenA" }, { type: "address", name: "tokenB" }],
    outputs: [{ type: "address", name: "pair" }]
  }
] as const;

const hobinPairAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint112", name: "reserve0" },
      { type: "uint112", name: "reserve1" },
      { type: "uint32", name: "blockTimestampLast" }
    ]
  },
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  }
] as const;

const hobinRouterAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "amountIn" }, { type: "address[]", name: "path" }],
    outputs: [{ type: "uint256[]", name: "amounts" }]
  },
  {
    type: "function",
    name: "swapExactETHForTokens",
    stateMutability: "payable",
    inputs: [
      { type: "uint256", name: "amountOutMin" },
      { type: "address[]", name: "path" },
      { type: "address", name: "to" },
      { type: "uint256", name: "deadline" }
    ],
    outputs: [{ type: "uint256[]", name: "amounts" }]
  },
  {
    type: "function",
    name: "swapExactTokensForETH",
    stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "amountIn" },
      { type: "uint256", name: "amountOutMin" },
      { type: "address[]", name: "path" },
      { type: "address", name: "to" },
      { type: "uint256", name: "deadline" }
    ],
    outputs: [{ type: "uint256[]", name: "amounts" }]
  }
] as const;

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function isNativePaymentToken(address: string) {
  return (
    sameAddress(address, ZERO_ADDRESS) ||
    robinhoodPaymentTokens.some((token) => token.symbol === "WETH" && sameAddress(token.address, address))
  );
}

function findOfficialStock(address: string) {
  return robinhoodStockTokens.find((stock) => sameAddress(stock.address, address));
}

function wethAddress() {
  return robinhoodPaymentTokens.find((token) => token.symbol === "WETH")?.address || "0x7943e237c7F95DA44E0301572D358911207852Fa";
}

async function rpcCall(to: string, data: string) {
  const response = await fetchJson<{ result?: `0x${string}`; error?: { message?: string } }>(robinhoodRpcUrl(), {
    method: "POST",
    body: { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] },
    timeoutMs: intEnv("ROBINHOOD_SWAP_TIMEOUT_MS", 12000)
  });
  if (!response.ok || response.data?.error || !response.data?.result) {
    throw new Error(response.data?.error?.message || response.error || "rpc_call_failed");
  }
  return response.data.result;
}

async function readContract(
  address: string,
  abi: Abi,
  functionName: string,
  args: readonly unknown[] = []
) {
  const data = encodeFunctionData({ abi, functionName, args });
  const result = await rpcCall(address, data);
  return decodeFunctionResult({ abi, functionName, data: result });
}

function applySlippage(value: bigint, slippagePercentage = 0.5) {
  const bps = Math.max(0, Math.min(5000, Math.round(slippagePercentage * 100)));
  return (value * BigInt(10_000 - bps)) / 10_000n;
}

function swapDeadline() {
  return BigInt(Math.floor(Date.now() / 1000) + intEnv("HOBIN_SWAP_DEADLINE_SECONDS", 1200));
}

async function tokenDecimals(address: string) {
  try {
    return Number(await readContract(address, erc20Abi, "decimals"));
  } catch {
    return 18;
  }
}

async function hobinPairReserves(pair: string, stock: RobinhoodToken) {
  const [reserve0, reserve1] = (await readContract(pair, hobinPairAbi, "getReserves")) as readonly [bigint, bigint, number];
  const token0 = (await readContract(pair, hobinPairAbi, "token0")) as string;
  const reserveWeth = sameAddress(token0, wethAddress()) ? reserve0 : reserve1;
  const reserveStock = sameAddress(token0, stock.address) ? reserve0 : reserve1;
  return { reserveWeth, reserveStock };
}

async function prepareHobinTrade(input: StockTradeInput) {
  const sourceIsEth = isNativePaymentToken(input.source_asset);
  const targetIsEth = isNativePaymentToken(input.target_asset);
  const buyStock = sourceIsEth ? findOfficialStock(input.target_asset) : undefined;
  const sellStock = targetIsEth ? findOfficialStock(input.source_asset) : undefined;
  const stock = buyStock || sellStock;

  if (!stock || sourceIsEth === targetIsEth) {
    return {
      ok: false,
      unsupported: true,
      provider: "hobin",
      action: input.action,
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: "Hobin only supports WETH/native ETH against one official stock token for this app.",
      supported_payment_asset: robinhoodPaymentTokens.find((token) => token.symbol === "WETH")
    };
  }

  const factory = env("HOBIN_FACTORY_ADDRESS", HOBIN_FACTORY);
  const router = env("HOBIN_ROUTER_ADDRESS", HOBIN_ROUTER);
  const weth = wethAddress();
  const pair = (await readContract(factory, hobinFactoryAbi, "getPair", [weth, stock.address])) as string;
  if (!pair || sameAddress(pair, ZERO_ADDRESS)) {
    return {
      ok: false,
      provider: "hobin",
      action: input.action,
      no_pair: true,
      stock: { symbol: stock.symbol, address: stock.address },
      factory,
      router,
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: `No Hobin WETH pair exists for official ${stock.symbol} token ${stock.address}.`
    };
  }

  const decimals = await tokenDecimals(stock.address);
  const amountIn = parseUnits(input.amount, sourceIsEth ? 18 : decimals);
  const path = (sourceIsEth ? [weth, stock.address] : [stock.address, weth]) as `0x${string}`[];
  const amounts = (await readContract(router, hobinRouterAbi, "getAmountsOut", [amountIn, path])) as readonly bigint[];
  const amountOut = amounts[amounts.length - 1] || 0n;
  const minAmountOut = applySlippage(amountOut, input.slippagePercentage);
  const { reserveWeth, reserveStock } = await hobinPairReserves(pair, stock);
  if (reserveWeth <= 0n || reserveStock <= 0n || amountOut <= 0n) {
    return {
      ok: false,
      provider: "hobin",
      action: input.action,
      no_liquidity: true,
      stock: { symbol: stock.symbol, address: stock.address },
      pair,
      reserves: { weth: reserveWeth.toString(), stock: reserveStock.toString() },
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: `Hobin pair for ${stock.symbol} exists but has no executable liquidity.`
    };
  }

  const deadline = swapDeadline();
  if (sourceIsEth) {
    return {
      ok: true,
      provider: "hobin",
      action: "buy",
      atomic: false,
      stock: { symbol: stock.symbol, address: stock.address },
      pair,
      router,
      factory,
      quote: {
        input_asset: "ETH",
        output_asset: stock.symbol,
        input_decimals: 18,
        output_decimals: decimals,
        amount_in: amountIn.toString(),
        amount_out: amountOut.toString(),
        min_amount_out: minAmountOut.toString(),
        path,
        reserves: { weth: reserveWeth.toString(), stock: reserveStock.toString() }
      },
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: "Hobin quote prepared. Wallet signature is required before execution.",
      transactionRequest: {
        label: `Swap ETH for ${stock.symbol}`,
        to: router,
        value: amountIn.toString(),
        data: encodeFunctionData({
          abi: hobinRouterAbi,
          functionName: "swapExactETHForTokens",
          args: [minAmountOut, path, input.wallet_address as `0x${string}`, deadline]
        })
      }
    };
  }

  return {
    ok: true,
    provider: "hobin",
    action: "sell",
    atomic: false,
    stock: { symbol: stock.symbol, address: stock.address },
    pair,
    router,
    factory,
    quote: {
      input_asset: stock.symbol,
      output_asset: "ETH",
      input_decimals: decimals,
      output_decimals: 18,
      amount_in: amountIn.toString(),
      amount_out: amountOut.toString(),
      min_amount_out: minAmountOut.toString(),
      path,
      reserves: { weth: reserveWeth.toString(), stock: reserveStock.toString() }
    },
    execution_boundary: "quote_preparation_only_wallet_signature_required",
    message: "Hobin quote prepared. Approve the stock token, then sign the swap.",
    transactions: [
      {
        label: `Approve ${stock.symbol}`,
        to: stock.address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [router as `0x${string}`, UINT256_MAX] })
      },
      {
        label: `Swap ${stock.symbol} for ETH`,
        to: router,
        data: encodeFunctionData({
          abi: hobinRouterAbi,
          functionName: "swapExactTokensForETH",
          args: [amountIn, minAmountOut, path, input.wallet_address as `0x${string}`, deadline]
        })
      }
    ]
  };
}

async function prepareRhSwapTrade(input: StockTradeInput) {
  const sourceIsEth = isNativePaymentToken(input.source_asset);
  const targetIsEth = isNativePaymentToken(input.target_asset);
  const buyStock = sourceIsEth ? findOfficialStock(input.target_asset) : undefined;
  const sellStock = targetIsEth ? findOfficialStock(input.source_asset) : undefined;
  const stock = buyStock || sellStock;

  if (!stock || sourceIsEth === targetIsEth) {
    return {
      ok: false,
      unsupported: true,
      provider: "rh_swap",
      action: input.action,
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: "RH Swap only supports native ETH against one official stock token per pair.",
      supported_payment_asset: robinhoodPaymentTokens.find((token) => token.symbol === "WETH")
    };
  }

  const factory = env("ROBINHOOD_SWAP_FACTORY_ADDRESS", RH_SWAP_FACTORY);
  const pair = (await readContract(factory, factoryAbi, "getPair", [stock.address])) as string;
  if (!pair || sameAddress(pair, ZERO_ADDRESS)) {
    return {
      ok: false,
      provider: "rh_swap",
      action: input.action,
      no_pair: true,
      stock: { symbol: stock.symbol, address: stock.address },
      factory,
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: `No RH Swap ETH pair exists for official ${stock.symbol} token ${stock.address}.`
    };
  }

  const decimals = await tokenDecimals(stock.address);
  const amountIn = parseUnits(input.amount, sourceIsEth ? 18 : decimals);
  const [reserveEth, reserveToken] = (await readContract(pair, pairAbi, "getReserves")) as readonly [bigint, bigint];
  if (reserveEth <= 0n || reserveToken <= 0n) {
    return {
      ok: false,
      provider: "rh_swap",
      action: input.action,
      no_liquidity: true,
      stock: { symbol: stock.symbol, address: stock.address },
      pair,
      reserves: { eth: reserveEth.toString(), token: reserveToken.toString() },
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: `RH Swap pair for ${stock.symbol} exists but has no executable liquidity.`
    };
  }

  if (sourceIsEth) {
    const tokensOut = (await readContract(pair, pairAbi, "quoteEthForTokens", [amountIn])) as bigint;
    const minTokensOut = applySlippage(tokensOut, input.slippagePercentage);
    return {
      ok: true,
      provider: "rh_swap",
      action: "buy",
      atomic: false,
      stock: { symbol: stock.symbol, address: stock.address },
      pair,
      quote: {
        input_asset: "ETH",
        output_asset: stock.symbol,
        input_decimals: 18,
        output_decimals: decimals,
        amount_in: amountIn.toString(),
        amount_out: tokensOut.toString(),
        min_amount_out: minTokensOut.toString(),
        reserves: { eth: reserveEth.toString(), token: reserveToken.toString() }
      },
      execution_boundary: "quote_preparation_only_wallet_signature_required",
      message: "RH Swap quote prepared. Wallet signature is required before execution.",
      transactionRequest: {
        label: `Swap ETH for ${stock.symbol}`,
        to: pair,
        value: amountIn.toString(),
        data: encodeFunctionData({ abi: pairAbi, functionName: "swapEthForTokens", args: [minTokensOut, input.wallet_address as `0x${string}`] })
      }
    };
  }

  const ethOut = (await readContract(pair, pairAbi, "quoteTokensForEth", [amountIn])) as bigint;
  const minEthOut = applySlippage(ethOut, input.slippagePercentage);
  return {
    ok: true,
    provider: "rh_swap",
    action: "sell",
    atomic: false,
    stock: { symbol: stock.symbol, address: stock.address },
    pair,
    quote: {
      input_asset: stock.symbol,
      output_asset: "ETH",
      input_decimals: decimals,
      output_decimals: 18,
      amount_in: amountIn.toString(),
      amount_out: ethOut.toString(),
      min_amount_out: minEthOut.toString(),
      reserves: { eth: reserveEth.toString(), token: reserveToken.toString() }
    },
    execution_boundary: "quote_preparation_only_wallet_signature_required",
    message: "RH Swap quote prepared. Approve the token, then sign the swap.",
    transactions: [
      {
        label: `Approve ${stock.symbol}`,
        to: stock.address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pair as `0x${string}`, UINT256_MAX] })
      },
      {
        label: `Swap ${stock.symbol} for ETH`,
        to: pair,
        data: encodeFunctionData({ abi: pairAbi, functionName: "swapTokensForEth", args: [amountIn, minEthOut, input.wallet_address as `0x${string}`] })
      }
    ]
  };
}

export async function prepareStockTrade(input: StockTradeInput) {
  const payload = buildQuotePayload(input);

  if (!looksAddress(input.source_asset) || !looksAddress(input.target_asset) || !looksAddress(input.wallet_address) || !input.amount) {
    return {
      ok: false,
      needs_input: ["source_asset", "target_asset", "wallet_address", "amount"],
      message: "Use exact on-chain token contracts. Symbols are not enough for Robinhood Chain stock trades.",
      received: payload,
      stock_universe: robinhoodStockTokens
    };
  }

  const provider = stockQuoteProviderStatus();
  if (provider.configured) {
    try {
      return await prepareHobinTrade(input);
    } catch (error) {
      const hobinError = error instanceof Error ? error.message : "unknown_error";
      if (provider.fallback_provider === "rh_swap") {
        try {
          const fallback = await prepareRhSwapTrade(input);
          return fallback.ok ? fallback : { ...fallback, attempted_provider: "hobin", attempted_provider_error: hobinError };
        } catch (fallbackError) {
          return {
            ok: false,
            provider: "hobin",
            fallback_provider: "rh_swap",
            action: input.action,
            atomic: false,
            execution_boundary: "quote_preparation_only_wallet_signature_required",
            message: "Hobin and RH Swap quote requests both failed.",
            error: hobinError,
            fallback_error: fallbackError instanceof Error ? fallbackError.message : "unknown_error",
            intended_request: payload
          };
        }
      }

      return {
        ok: false,
        provider: "hobin",
        action: input.action,
        atomic: false,
        execution_boundary: "quote_preparation_only_wallet_signature_required",
        message: "Hobin quote request failed.",
        error: hobinError,
        intended_request: payload
      };
    }
  }

  return {
    ok: false,
    unsupported: true,
    provider: null,
    action: input.action,
    atomic: false,
    strategy: input.strategy || "",
    execution_boundary: "quote_provider_required",
    needs_configuration: provider.needs_configuration,
    message: "Hobin quote preparation is unavailable because Robinhood Chain RPC, factory, or router configuration is missing.",
    intended_request: payload
  };
}
