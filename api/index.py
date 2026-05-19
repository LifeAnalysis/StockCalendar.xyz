import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any, Dict, List, Optional


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "deepseek/deepseek-v4-flash"
NUVOLARI_DEFAULT_API_BASE_URL = "https://api.staging.nuvolari.ai"
CONTEXT7_NUVOLARI = "https://context7.com/websites/nuvolari_ai/llms.txt"
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
AIMEME_ROOT = _PROJECT_ROOT / "knowledge" / "aimeme" / "aimeme-memecoin-pipeline"
AIMEME_REFERENCES = AIMEME_ROOT / "references"
NUVOLARI_DOCS = {
    "swap": "https://docs.nuvolari.ai/execution-engine/swap.md",
    "yield": "https://docs.nuvolari.ai/execution-engine/yield.md",
    "liquidity": "https://docs.nuvolari.ai/execution-engine/add-liquidity.md",
    "shortcuts": "https://docs.nuvolari.ai/execution-engine/shortcuts.md",
    "agents": "https://docs.nuvolari.ai/execution-engine/agents.md",
    "insights": "https://docs.nuvolari.ai/ai-engine/insights.md",
}
NUVOLARI_DEFAULT_PATHS = {
    "swap": "/v1/execution/quote",
    "buy": "/v1/execution/quote",
    "yield": "/v1/yields",
    "enter_yield": "/v1/execution/quote",
    "add_liquidity": "/v1/execution/quote",
    "execution_quote": "/v1/execution/quote",
    "execution_execute": "/v1/execution/execute",
    "stablecoin_yields": "/v1/yields/stablecoins",
}
CHAIN_IDS = {
    "ethereum": 1,
    "mainnet": 1,
    "hyperevm": 999,
    "arbitrum": 42161,
    "arbitrum one": 42161,
    "bsc": 56,
    "binance": 56,
    "base": 8453,
    "monad": 143,
}
AIMEME_NETWORKS = {
    "eth": "ethereum",
    "ethereum": "ethereum",
    "sol": "solana",
    "solana": "solana",
    "base": "base",
    "arb": "arbitrum",
    "arbitrum": "arbitrum",
    "bsc": "bsc",
}
AIMEME_GECKO_NETWORKS = {
    "eth": "eth",
    "ethereum": "eth",
    "sol": "solana",
    "solana": "solana",
    "base": "base",
    "arb": "arbitrum",
    "arbitrum": "arbitrum",
    "bsc": "bsc",
}
AIMEME_CHAIN_IDS = {
    "eth": 1,
    "ethereum": 1,
    "base": 8453,
    "arb": 42161,
    "arbitrum": 42161,
    "bsc": 56,
}
AIMEME_REFERENCE_FILES = {
    "overview": ["onepager.md", "pipeline.md", "buy-workflow.md"],
    "buy": ["buy-workflow.md", "onepager.md", "pipeline.md"],
    "pipeline": ["pipeline.md", "onepager.md"],
    "apis": ["pipeline.md", "buy-workflow.md", "code/dashboard-market.ts.txt", "code/poll-prices.mjs.txt"],
    "autowiki": ["autowiki/README.md", "autowiki/config/CLAUDE.md", "autowiki/wiki/index.md"],
    "yield": ["buy-workflow.md", "onepager.md"],
}
AIMEME_EMBEDDED_REFERENCES = {
    "onepager.md": """# AImeme one-pager

Autonomous memecoin pipeline for ETH, Base, Solana, Arbitrum, and global trending pools. It discovers candidates, runs cheap gates first, spends on AgentCash/Nansen only for survivors, and stops at the wallet/signature boundary.

Core stack: GeckoTerminal/CoinGecko trending, DexScreener market tape, Rugcheck for Solana, GoPlus for EVM safety, AgentCash/Nansen for smart-money enrichment, Nuvolari for quote preparation.

Sizing doctrine: S=$200, A=$150, B=$100, C=$75, D=$50. Use trailing stops, take profit around +100%, and never average down tiny-spec entries.
""",
    "pipeline.md": """# AImeme pipeline v3.9

Run on the deployed cron schedule or manually as a coordinator swarm:
1. Discovery: GeckoTerminal/CoinGecko trending pools across all chains unless the user specifies a chain.
2. Cheap prefilter: reject scam/test symbols, dust liquidity, active dumps, wash-like volume, bad decimals, and aggregate-vs-instantaneous contradictions.
3. Safety: Rugcheck for Solana; GoPlus for EVM. Hard-kill honeypot, critical risk, hidden owner, mintable/proxy risk, prior honeypot creator, high tax, or low Rugcheck score.
4. Tape/liquidity: DexScreener deepest pair, liquidity floor, h1/h6 momentum, h1 buys vs sells.
5. Smart money: AgentCash/Nansen holdings and TGM holders only after free gates survive. Active vs exited smart money matters more than lifetime trader counts.
6. Decision: CLEAN BUY, TINY SPEC, WATCH, NO BUY, TAKE_PROFIT, TRIM_OR_EXIT, EXIT.
7. Execution: prepare Nuvolari quote only after exact addresses, chain IDs, wallet EOA, and integer amount. Never sign from the agent.

Meta-rule: aggregate metrics lie. Trust m5/m15/m30/h1 direction when it diverges from h24 or 7d aggregates.
""",
    "buy-workflow.md": """# AImeme buy workflow

Default answer to "what should I buy?":
- Start with AImeme workflow and AutoWiki priors.
- Discover candidates globally unless chain-constrained.
- Run free DexScreener/Rugcheck/GoPlus gates before any paid call.
- Generate AgentCash/Nansen commands for survivors only.
- Return buy/watch/no-buy with size, reason, main risk, invalidation, and missing execution inputs.

Never call a token a buy only because it appears in Nansen smart-money data. Nansen is discovery, not permission.
""",
    "code/dashboard-market.ts.txt": """AImeme market code snapshot: DexScreener token endpoint, filter by chain, choose deepest pair by liquidity, extract price/liquidity/fdv/marketCap/volume/priceChange/txns, then produce market-only enter/sell/pass heuristics.""",
    "code/poll-prices.mjs.txt": """AImeme poller snapshot: periodically fetch DexScreener prices for tracked tokens and persist compact history for performance and trading decisions.""",
}
AIMEME_SUBAGENTS = {
    "discovery": {
        "role": "Find fresh memecoin candidates across chains.",
        "skills": ["aimeme_geckoterminal_trending", "aimeme_workflow_query"],
        "outputs": ["candidate pools", "base token addresses", "chain/network"],
    },
    "tape": {
        "role": "Check executable market quality.",
        "skills": ["aimeme_dexscreener_token"],
        "outputs": ["deepest pair", "liquidity", "h1/h6 tape", "buy/sell pressure"],
    },
    "market_monitor": {
        "role": "Track known candidates and positions for trading decisions.",
        "skills": ["aimeme_market_monitor"],
        "outputs": ["live price", "liquidity changes", "momentum", "enter/hold/trim/exit hints"],
    },
    "safety": {
        "role": "Run free hard-kill safety gates.",
        "skills": ["aimeme_rugcheck_token", "aimeme_goplus_token_security"],
        "outputs": ["honeypot/proxy/tax/LP risk", "hard kill flags"],
    },
    "smart_money": {
        "role": "Prepare paid AgentCash/Nansen enrichment.",
        "skills": ["aimeme_agentcash_template"],
        "outputs": ["Nansen holdings command", "TGM holders command", "active vs exited SM requirement"],
    },
    "execution": {
        "role": "Prepare Nuvolari quote only after a candidate survives.",
        "skills": ["nuvolari_execution_quote", "nuvolari_execute_signed_supertransaction"],
        "outputs": ["required token addresses", "chain IDs", "EOA", "integer amount", "signature boundary"],
    },
    "learning": {
        "role": "Apply AutoWiki lessons and stage new lessons after a run.",
        "skills": ["aimeme_workflow_query"],
        "outputs": ["relevant rules", "new proposed learning if warranted"],
    },
}


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


def _nuvolari_base_url() -> str:
    return (_env("NUVOLARI_API_BASE_URL") or NUVOLARI_DEFAULT_API_BASE_URL).rstrip("/")


def _configured_path(env_name: str, default_key: str) -> str:
    return _env(env_name) or NUVOLARI_DEFAULT_PATHS[default_key]


def _chain_id(value: Any) -> Optional[int]:
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if text.isdigit():
        return int(text)
    return CHAIN_IDS.get(text.lower())


def _looks_address(value: str) -> bool:
    text = (value or "").strip()
    return text.startswith("0x") and len(text) == 42


def _json_request(
    url: str,
    *,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    body: Optional[Dict[str, Any]] = None,
    timeout: int = 45,
) -> Dict[str, Any]:
    data = None
    req_headers = {"Accept": "application/json", "User-Agent": "hermes-nuvolari-agent/1.0", **(headers or {})}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = {"text": raw}
            return {"ok": True, "status": resp.status, "data": parsed}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"text": raw}
        return {"ok": False, "status": exc.code, "data": parsed}
    except Exception as exc:
        return {"ok": False, "status": 0, "error": str(exc)}


def _int_env(name: str, default: int, minimum: int = 1, maximum: int = 200000) -> int:
    try:
        value = int(_env(name) or default)
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(value, maximum))


def _openrouter_model() -> str:
    return _env("OPENROUTER_MODEL") or DEFAULT_MODEL


def _openrouter_max_tokens() -> int:
    return _int_env("OPENROUTER_MAX_TOKENS", 8192, minimum=512, maximum=65536)


def _openrouter_history_turns() -> int:
    return _int_env("OPENROUTER_HISTORY_TURNS", 24, minimum=2, maximum=80)


def _openrouter_transforms() -> List[str]:
    raw = _env("OPENROUTER_TRANSFORMS")
    if raw:
        return [item.strip() for item in raw.split(",") if item.strip()]
    return ["middle-out"]


def _read_aimeme_reference(relative_path: str, limit: int = 9000) -> Dict[str, Any]:
    safe_path = Path(relative_path)
    if safe_path.is_absolute() or ".." in safe_path.parts:
        return {"ok": False, "path": relative_path, "error": "Invalid reference path"}
    path = (AIMEME_REFERENCES / safe_path).resolve()
    try:
        if not str(path).startswith(str(AIMEME_REFERENCES.resolve())):
            return {"ok": False, "path": relative_path, "error": "Reference path escapes AImeme directory"}
        if not path.exists():
            txt_path = Path(str(path) + ".txt")
            if txt_path.exists() and str(txt_path).startswith(str(AIMEME_REFERENCES.resolve())):
                path = txt_path
        content = path.read_text(encoding="utf-8", errors="replace")
        return {
            "ok": True,
            "path": str(safe_path),
            "content": content[:limit],
            "truncated": len(content) > limit,
        }
    except Exception as exc:
        embedded = AIMEME_EMBEDDED_REFERENCES.get(str(safe_path))
        if embedded is not None:
            return {
                "ok": True,
                "path": str(safe_path),
                "content": embedded[:limit],
                "truncated": len(embedded) > limit,
                "embedded_fallback": True,
            }
        return {"ok": False, "path": relative_path, "error": str(exc)}


def _aimeme_reference_available(relative_path: str) -> bool:
    path = AIMEME_REFERENCES / relative_path
    return path.exists() or Path(str(path) + ".txt").exists() or relative_path in AIMEME_EMBEDDED_REFERENCES


def _aimeme_chain_id(chain: str) -> Optional[int]:
    if not chain:
        return None
    text = str(chain).strip().lower()
    if text.isdigit():
        return int(text)
    return AIMEME_CHAIN_IDS.get(text) or _chain_id(text)


def _compact_pair(pair: Dict[str, Any]) -> Dict[str, Any]:
    liquidity = pair.get("liquidity") or {}
    volume = pair.get("volume") or {}
    price_change = pair.get("priceChange") or {}
    txns = pair.get("txns") or {}
    base_token = pair.get("baseToken") or {}
    quote_token = pair.get("quoteToken") or {}
    return {
        "chainId": pair.get("chainId"),
        "dexId": pair.get("dexId"),
        "url": pair.get("url"),
        "pairAddress": pair.get("pairAddress"),
        "baseToken": {
            "address": base_token.get("address"),
            "symbol": base_token.get("symbol"),
            "name": base_token.get("name"),
        },
        "quoteToken": {
            "address": quote_token.get("address"),
            "symbol": quote_token.get("symbol"),
            "name": quote_token.get("name"),
        },
        "priceUsd": pair.get("priceUsd"),
        "liquidityUsd": liquidity.get("usd"),
        "fdv": pair.get("fdv"),
        "marketCap": pair.get("marketCap"),
        "volume": {
            "m5": volume.get("m5"),
            "h1": volume.get("h1"),
            "h6": volume.get("h6"),
            "h24": volume.get("h24"),
        },
        "priceChange": {
            "m5": price_change.get("m5"),
            "h1": price_change.get("h1"),
            "h6": price_change.get("h6"),
            "h24": price_change.get("h24"),
        },
        "txns": {
            key: {
                "buys": (value or {}).get("buys"),
                "sells": (value or {}).get("sells"),
            }
            for key, value in txns.items()
            if key in {"m5", "m15", "m30", "h1", "h6", "h24"}
        },
    }


def _dexscreener_action(pair: Dict[str, Any]) -> Dict[str, Any]:
    liquidity = float((pair.get("liquidity") or {}).get("usd") or 0)
    price_change = pair.get("priceChange") or {}
    txns = pair.get("txns") or {}
    h1 = float(price_change.get("h1") or 0)
    h6 = float(price_change.get("h6") or 0)
    h1_txns = txns.get("h1") or {}
    buys = float(h1_txns.get("buys") or 0)
    sells = float(h1_txns.get("sells") or 0)
    if liquidity < 30000:
        return {"label": "NO BUY", "reason": "Executable liquidity is below the AImeme $30k floor."}
    if h1 <= 0 or h6 <= 5:
        return {"label": "WATCH", "reason": "Tape is not yet strong enough: needs positive h1 and h6 > 5%."}
    if buys <= sells:
        return {"label": "WATCH", "reason": "H1 buyers do not exceed sellers yet."}
    return {"label": "MARKET PASS", "reason": "DexScreener tape/liquidity pass; still requires safety and smart-money checks."}


def _gecko_relationship_id(item: Dict[str, Any], key: str) -> str:
    rel = item.get("relationships") or {}
    value = (rel.get(key, {}).get("data") or {}).get("id")
    return str(value or "")


def _gecko_token_address(item: Dict[str, Any]) -> str:
    token_id = _gecko_relationship_id(item, "base_token")
    if "_" in token_id:
        return token_id.split("_", 1)[1]
    return token_id


def _safety_gate_label(result: Dict[str, Any], chain: str) -> Dict[str, str]:
    if not result.get("ok"):
        return {"label": "UNKNOWN", "reason": result.get("error") or "Safety API did not return a usable response."}
    if str(chain).lower() == "solana":
        summary = result.get("summary") or {}
        risks = summary.get("risks")
        score = summary.get("score_normalised") or summary.get("score")
        try:
            if float(score or 0) < 20:
                return {"label": "NO BUY", "reason": f"Rugcheck score below 20 ({score})."}
        except (TypeError, ValueError):
            pass
        if risks:
            return {"label": "REVIEW", "reason": "Rugcheck returned explicit risks; review before any buy."}
        return {"label": "PASS", "reason": "No hard Rugcheck kill flag surfaced in summary."}
    hard_flags = result.get("hard_flags") or []
    if hard_flags:
        return {"label": "NO BUY", "reason": "GoPlus hard flags: " + ", ".join(hard_flags)}
    return {"label": "PASS", "reason": "No hard GoPlus kill flag surfaced."}


def _market_decision(pair: Dict[str, Any], entry_price: Any = None) -> Dict[str, Any]:
    liquidity = float((pair.get("liquidity") or {}).get("usd") or 0)
    price_change = pair.get("priceChange") or {}
    txns = pair.get("txns") or {}
    h1 = float(price_change.get("h1") or 0)
    h6 = float(price_change.get("h6") or 0)
    h24 = float(price_change.get("h24") or 0)
    h1_txns = txns.get("h1") or {}
    buys = float(h1_txns.get("buys") or 0)
    sells = float(h1_txns.get("sells") or 0)
    price = None
    pnl_pct = None
    try:
        price = float(pair.get("priceUsd") or 0)
        entry = float(entry_price) if entry_price not in ("", None) else None
        if entry and entry > 0 and price:
            pnl_pct = ((price - entry) / entry) * 100
    except (TypeError, ValueError):
        pass
    if liquidity < 30000:
        action = "EXIT_OR_AVOID"
        reason = "Liquidity is below the $30k execution floor."
    elif pnl_pct is not None and pnl_pct <= -30:
        action = "EXIT"
        reason = "Position is beyond the -30% trail threshold."
    elif h1 < -10 or (sells > buys * 2 and sells >= 10):
        action = "TRIM_OR_EXIT"
        reason = "Short-term tape is dumping or sellers dominate."
    elif pnl_pct is not None and pnl_pct >= 100:
        action = "TAKE_PROFIT"
        reason = "Position is above +100%; AImeme doctrine scales 50%."
    elif h1 > 0 and h6 > 5 and buys > sells:
        action = "HOLD_OR_ENTER_AFTER_SM"
        reason = "Tape is constructive; require smart-money/safety context before new entry."
    else:
        action = "WATCH"
        reason = "No hard exit, but momentum is not strong enough for a fresh entry."
    return {
        "action": action,
        "reason": reason,
        "priceUsd": price,
        "pnlPct": pnl_pct,
        "liquidityUsd": liquidity,
        "h1ChangePct": h1,
        "h6ChangePct": h6,
        "h24ChangePct": h24,
        "h1Buys": buys,
        "h1Sells": sells,
    }


def _aimeme_tracked_tokens_from_env() -> List[Dict[str, Any]]:
    raw = _env("AIMEME_TRACKED_TOKENS")
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]
    return []


def _portfolio_action_bucket(action: Any) -> str:
    value = str(action or "").upper()
    if value in {"EXIT", "EXIT_OR_AVOID", "TRIM_OR_EXIT"}:
        return "sell"
    if value in {"TAKE_PROFIT"}:
        return "trim"
    if value in {"HOLD_OR_ENTER_AFTER_SM", "CLEAN BUY", "TINY SPEC"}:
        return "buy_watch"
    if value in {"NO BUY", "NO DATA"}:
        return "avoid"
    return "watch"


def _cron_authorized(headers: Any) -> bool:
    secret = _env("AIMEME_CRON_SECRET")
    if not secret:
        return True
    provided = ""
    try:
        provided = headers.get("x-cron-secret") or headers.get("authorization", "").removeprefix("Bearer ").strip()
    except Exception:
        provided = ""
    return provided == secret


def _nuvolari_headers() -> Dict[str, str]:
    api_key = _env("NUVOLARI_API_KEY")
    secret = _env("NUVOLARI_SECRET_API_KEY")
    headers = {
        "User-Agent": "hermes-nuvolari-agent/1.0",
        "X-Nuvolari-Client": "Gary",
    }
    if api_key:
        headers["x-api-key"] = api_key
        headers["X-API-Key"] = api_key
        headers["X-Nuvolari-API-Key"] = api_key
    if secret:
        headers["x-secret-api-key"] = secret
        headers["X-API-Secret"] = secret
        headers["X-Nuvolari-API-Secret"] = secret
        headers["Authorization"] = f"Bearer {secret}"
    return headers


def _nuvolari_call(path: str, payload: Dict[str, Any], method: str = "POST") -> Dict[str, Any]:
    base_url = _nuvolari_base_url()
    if not base_url:
        return {
            "ok": False,
            "needs_configuration": "NUVOLARI_API_BASE_URL",
            "message": (
                "Nuvolari credentials are configured, but the execution API base URL "
                "is not set. Add NUVOLARI_API_BASE_URL in Vercel once Nuvolari gives "
                "you the API host."
            ),
            "intended_request": {"method": method.upper(), "path": path, "body": payload},
            "available_docs": NUVOLARI_DOCS,
            "context7": CONTEXT7_NUVOLARI,
        }
    method = method.upper()
    url = f"{base_url}/{path.lstrip('/')}"
    body = payload
    if method == "GET":
        query = {k: v for k, v in payload.items() if v not in ("", None, [], {})}
        if query:
            url = f"{url}?{urllib.parse.urlencode(query)}"
        body = None
    return _json_request(
        url,
        method=method,
        headers=_nuvolari_headers(),
        body=body,
    )


def _missing_path(env_name: str, action: str, payload: Dict[str, Any], docs_topic: str, method: str = "POST") -> Dict[str, Any]:
    return {
        "ok": False,
        "needs_configuration": env_name,
        "message": (
            f"Nuvolari credentials and base URL are configured, but the exact REST path for {action} "
            "is not published in the Context7/docs material. Configure this path in Vercel before "
            "calling the live API."
        ),
        "intended_request": {"method": method.upper(), "path_env": env_name, "body": payload},
        "docs_source": NUVOLARI_DOCS.get(docs_topic, NUVOLARI_DOCS["shortcuts"]),
        "context7": CONTEXT7_NUVOLARI,
    }


def nuvolari_swap_quote(
    input_asset: str,
    output_asset: str,
    amount: str,
    input_chain: str = "",
    output_chain: str = "",
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    payload = {
        "srcTokenAddress": input_asset,
        "destTokenAddress": output_asset,
        "srcChainId": _chain_id(input_chain),
        "destChainId": _chain_id(output_chain) or _chain_id(input_chain),
        "userAddress": wallet_address,
        "amount": amount,
    }
    missing = [key for key, value in payload.items() if value in ("", None)]
    if missing or not _looks_address(input_asset) or not _looks_address(output_asset) or not _looks_address(wallet_address):
        return {
            "ok": False,
            "needs_input": ["srcTokenAddress", "destTokenAddress", "srcChainId", "destChainId", "userAddress", "amount"],
            "message": "Nuvolari execution quotes require token contract addresses, numeric chain IDs, user EOA address, and integer amount. Asset symbols like USDC/ETH are not enough for /v1/execution/quote.",
            "received": payload,
            "docs_source": "https://api.staging.nuvolari.ai/reference",
        }
    path = _configured_path("NUVOLARI_SWAP_PATH", "swap")
    return _nuvolari_call(
        path,
        payload,
    )


def nuvolari_buy_asset(
    asset: str,
    amount: str,
    pay_with_asset: str = "USDC",
    chain: str = "",
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    payload = {
        "srcTokenAddress": pay_with_asset,
        "destTokenAddress": asset,
        "srcChainId": _chain_id(chain),
        "destChainId": _chain_id(chain),
        "userAddress": wallet_address,
        "amount": amount,
    }
    missing = [key for key, value in payload.items() if value in ("", None)]
    if missing or not _looks_address(asset) or not _looks_address(pay_with_asset) or not _looks_address(wallet_address):
        return {
            "ok": False,
            "needs_input": ["srcTokenAddress/pay_with_asset", "destTokenAddress/asset", "chainId", "userAddress", "amount"],
            "message": "Nuvolari buy actions use /v1/execution/quote and require token contract addresses, numeric chain ID, user EOA address, and integer amount.",
            "received": payload,
            "docs_source": "https://api.staging.nuvolari.ai/reference",
        }
    path = _configured_path("NUVOLARI_BUY_PATH", "buy")
    return _nuvolari_call(
        path,
        payload,
    )


def nuvolari_yield_opportunities(
    underlying_asset: str,
    risk_profile: str = "balanced",
    min_apy: str = "",
    chain: str = "",
) -> Dict[str, Any]:
    response = _nuvolari_call(_configured_path("NUVOLARI_YIELD_PATH", "yield"), {}, method="GET")
    if not response.get("ok"):
        return response
    opportunities = response.get("data") if isinstance(response.get("data"), list) else []
    chain_id = _chain_id(chain)
    asset = (underlying_asset or "").upper()
    min_apy_value = None
    try:
        min_apy_value = float(min_apy) if min_apy not in ("", None) else None
    except (TypeError, ValueError):
        min_apy_value = None

    def matches(item: Dict[str, Any]) -> bool:
        token = item.get("inputToken") or {}
        if chain_id and item.get("chainId") != chain_id and token.get("chainId") != chain_id:
            return False
        if asset:
            values = {
                str(token.get("symbol", "")).upper(),
                str(token.get("name", "")).upper(),
                str(item.get("underlyingTokenAddress", "")).upper(),
                str(token.get("address", "")).upper(),
            }
            if asset not in values:
                return False
        if min_apy_value is not None and float(item.get("apyBase") or 0) < min_apy_value:
            return False
        return True

    filtered = [item for item in opportunities if isinstance(item, dict) and matches(item)]
    filtered.sort(key=lambda item: float(item.get("apyBase") or 0), reverse=True)
    top = filtered[:12]
    return {
        "ok": True,
        "source": _configured_path("NUVOLARI_YIELD_PATH", "yield"),
        "filters": {"underlying_asset": underlying_asset, "risk_profile": risk_profile, "min_apy": min_apy, "chain": chain, "chainId": chain_id},
        "total_count": len(opportunities),
        "matched_count": len(filtered),
        "opportunities": [
            {
                "name": item.get("name"),
                "protocol": (item.get("protocolProvider") or {}).get("name"),
                "type": item.get("type"),
                "chainId": item.get("chainId"),
                "inputToken": item.get("inputToken"),
                "outputToken": item.get("outputToken"),
                "yieldAddress": item.get("yieldAddress"),
                "apyBase": item.get("apyBase"),
                "tvlUsd": item.get("tvlUsd"),
                "opportunityRiskScore": item.get("opportunityRiskScore"),
                "description": item.get("description"),
                "protocolVaultUrl": item.get("protocolVaultUrl"),
            }
            for item in top
        ],
    }


def nuvolari_enter_yield(
    strategy_id: str,
    input_asset: str,
    amount: str,
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    payload = {
        "destTokenAddress": strategy_id,
        "srcTokenAddress": input_asset,
        "amount": amount,
        "userAddress": wallet_address,
    }
    return {
        "ok": False,
        "needs_input": ["srcChainId", "destChainId", "srcTokenAddress", "destTokenAddress", "userAddress", "amount"],
        "message": "Use nuvolari_execution_quote for yield entry. Pass the selected opportunity output token/vault address as destTokenAddress and include source/destination chain IDs.",
        "received": payload,
        "docs_source": "https://api.staging.nuvolari.ai/reference",
    }


def nuvolari_add_liquidity(
    asset_a: str,
    asset_b: str,
    amount_a: str,
    amount_b: str = "",
    chain: str = "",
    fee_tier: str = "",
    price_range: str = "",
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    payload = {
        "asset_a": asset_a,
        "asset_b": asset_b,
        "amount_a": amount_a,
        "amount_b": amount_b,
        "chain": chain,
        "fee_tier": fee_tier,
        "price_range": price_range,
        "wallet_address": wallet_address,
        "execute": bool(execute),
    }
    return {
        "ok": False,
        "message": "The OpenAPI spec exposes generic /v1/execution/quote for executable actions, not a separate add-liquidity REST path. Use nuvolari_execution_quote with the destination vault/pool token address once selected.",
        "received": payload,
        "docs_source": "https://api.staging.nuvolari.ai/reference",
    }


def nuvolari_execution_quote(
    srcTokenAddress: str,
    destTokenAddress: str,
    srcChainId: int,
    destChainId: int,
    userAddress: str,
    amount: str,
    slippagePercentage: float = 0.5,
) -> Dict[str, Any]:
    payload = {
        "srcTokenAddress": srcTokenAddress,
        "destTokenAddress": destTokenAddress,
        "srcChainId": int(srcChainId),
        "destChainId": int(destChainId),
        "slippagePercentage": slippagePercentage,
        "userAddress": userAddress,
        "amount": amount,
    }
    missing = [key for key, value in payload.items() if value in ("", None)]
    if missing or not _looks_address(srcTokenAddress) or not _looks_address(destTokenAddress) or not _looks_address(userAddress):
        return {
            "ok": False,
            "needs_input": ["srcTokenAddress", "destTokenAddress", "srcChainId", "destChainId", "userAddress", "amount"],
            "message": "Nuvolari /v1/execution/quote requires exact token or vault contract addresses, numeric chain IDs, the user's wallet EOA, and an integer base-unit amount. Symbols or human decimal amounts are not enough.",
            "received": payload,
            "docs_source": "https://api.staging.nuvolari.ai/reference",
        }
    return _nuvolari_call(_configured_path("NUVOLARI_EXECUTION_QUOTE_PATH", "execution_quote"), payload)


def nuvolari_execute_signed_supertransaction(quoteId: str, signatures: List[str]) -> Dict[str, Any]:
    if not quoteId or not signatures:
        return {
            "ok": False,
            "needs_input": ["quoteId", "signatures"],
            "message": "Nuvolari /v1/execution/execute requires a quoteId plus user-produced signatures from the account flow. The agent cannot sign for the wallet.",
            "received": {"quoteId": quoteId, "signatures_count": len(signatures or [])},
            "docs_source": "https://api.staging.nuvolari.ai/reference",
        }
    return _nuvolari_call(
        _configured_path("NUVOLARI_EXECUTION_EXECUTE_PATH", "execution_execute"),
        {"quoteId": quoteId, "signatures": signatures},
    )


def nuvolari_stablecoin_yields(chain: str = "", min_apy: str = "") -> Dict[str, Any]:
    response = _nuvolari_call(_configured_path("NUVOLARI_STABLECOIN_YIELDS_PATH", "stablecoin_yields"), {}, method="GET")
    if not response.get("ok"):
        return response
    opportunities = response.get("data") if isinstance(response.get("data"), list) else []
    chain_id = _chain_id(chain)
    try:
        min_apy_value = float(min_apy) if min_apy not in ("", None) else None
    except (TypeError, ValueError):
        min_apy_value = None
    filtered = []
    for item in opportunities:
        token = item.get("token") if isinstance(item, dict) else {}
        if chain_id and token.get("chainId") != chain_id:
            continue
        if min_apy_value is not None and float(item.get("currentApy") or 0) < min_apy_value:
            continue
        filtered.append(item)
    filtered.sort(key=lambda item: float(item.get("currentApy") or 0), reverse=True)
    return {
        "ok": True,
        "source": _configured_path("NUVOLARI_STABLECOIN_YIELDS_PATH", "stablecoin_yields"),
        "filters": {"chain": chain, "chainId": chain_id, "min_apy": min_apy},
        "total_count": len(opportunities),
        "matched_count": len(filtered),
        "opportunities": filtered[:12],
    }


def nuvolari_raw_api(method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if path.startswith("http://") or path.startswith("https://"):
        return {
            "ok": False,
            "error": "External URLs are not valid Nuvolari API paths.",
            "message": "Use nuvolari_docs_query or nuvolari_context7_query for documentation URLs. Use nuvolari_raw_api only for paths on NUVOLARI_API_BASE_URL.",
            "path": path,
        }
    return _nuvolari_call(path, body or {}, method=method)


def nuvolari_docs_query(topic: str, question: str) -> Dict[str, Any]:
    url = NUVOLARI_DOCS.get(topic.lower(), NUVOLARI_DOCS["shortcuts"])
    ask_url = f"{url}?ask={urllib.parse.quote(question)}"
    req = urllib.request.Request(
        ask_url,
        headers={
            "Accept": "text/markdown,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 hermes-nuvolari-agent/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {"ok": True, "topic": topic, "answer": resp.read().decode("utf-8", errors="replace")}
    except Exception as exc:
        return {"ok": False, "topic": topic, "error": str(exc), "url": ask_url}


def nuvolari_context7_query(question: str = "") -> Dict[str, Any]:
    req = urllib.request.Request(
        CONTEXT7_NUVOLARI,
        headers={"Accept": "text/plain,*/*", "User-Agent": "Mozilla/5.0 hermes-nuvolari-agent/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read().decode("utf-8", errors="replace")
        return {
            "ok": True,
            "source": CONTEXT7_NUVOLARI,
            "question": question,
            "content": content[:14000],
            "truncated": len(content) > 14000,
        }
    except Exception as exc:
        return {"ok": False, "source": CONTEXT7_NUVOLARI, "error": str(exc)}


def aimeme_workflow_query(topic: str = "overview", question: str = "") -> Dict[str, Any]:
    key = (topic or "overview").strip().lower()
    files = AIMEME_REFERENCE_FILES.get(key, AIMEME_REFERENCE_FILES["overview"])
    references = [_read_aimeme_reference(path, limit=7000) for path in files]
    return {
        "ok": True,
        "topic": key,
        "question": question,
        "skill_path": str(AIMEME_ROOT),
        "references": references,
        "rules": [
            "Run cheap live gates before paid Nansen enrichment.",
            "Nansen smart-money is discovery, not permission to buy.",
            "Reject aggregate-vs-instantaneous contradictions: h24 can lie when m5/m15/m30 are dumping.",
            "For Nuvolari execution, require exact token/vault addresses, chain IDs, wallet EOA, and integer base-unit amount.",
        ],
    }


def aimeme_subagent_manifest(task: str = "") -> Dict[str, Any]:
    return {
        "ok": True,
        "source": "Hermes AImeme coordinator",
        "task": task,
        "serverless_note": "On Vercel these are coordinator lanes backed by tool calls, not long-lived worker processes.",
        "coordinator_policy": [
            "Start with discovery unless the user gives a token address.",
            "Run tape and safety lanes before paid smart-money enrichment.",
            "Use smart_money lane for AgentCash/Nansen command generation or live paid results only when configured outside this Vercel function.",
            "Use execution lane only for quote preparation; final buy requires wallet EOA and user signatures.",
            "Use learning lane to apply AutoWiki rules and stage new lessons, never silently overwrite canonical wiki files.",
        ],
        "subagents": AIMEME_SUBAGENTS,
    }


def aimeme_dexscreener_token(token_address: str, chain: str = "") -> Dict[str, Any]:
    token = (token_address or "").strip()
    if not token:
        return {"ok": False, "needs_input": ["token_address"], "message": "DexScreener token lookup requires a token contract or mint address."}
    response = _json_request(f"https://api.dexscreener.com/latest/dex/tokens/{urllib.parse.quote(token)}", timeout=20)
    if not response.get("ok"):
        return response
    pairs = response.get("data", {}).get("pairs") if isinstance(response.get("data"), dict) else []
    pairs = pairs if isinstance(pairs, list) else []
    chain_filter = AIMEME_NETWORKS.get(str(chain).strip().lower(), str(chain).strip().lower())
    if chain_filter:
        pairs = [pair for pair in pairs if str(pair.get("chainId", "")).lower() == chain_filter]
    pairs.sort(key=lambda pair: float((pair.get("liquidity") or {}).get("usd") or 0), reverse=True)
    best = pairs[0] if pairs else {}
    return {
        "ok": True,
        "source": "https://api.dexscreener.com/latest/dex/tokens/{token}",
        "token_address": token,
        "chain": chain,
        "matched_count": len(pairs),
        "best_pair": _compact_pair(best) if best else None,
        "market_gate": _dexscreener_action(best) if best else {"label": "NO DATA", "reason": "No matching DexScreener pair found."},
        "market_decision": _market_decision(best) if best else {"action": "NO DATA", "reason": "No matching DexScreener pair found."},
        "pair_candidates": [_compact_pair(pair) for pair in pairs[:5]],
    }


def aimeme_market_monitor(tokens: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(tokens, list) or not tokens:
        return {
            "ok": False,
            "needs_input": ["tokens"],
            "message": "Pass tokens as a list of objects with address, chain, optional symbol, optional entry_price, and optional position_usd.",
        }
    monitored = []
    for item in tokens[:20]:
        if not isinstance(item, dict):
            continue
        token = str(item.get("address") or item.get("token_address") or "").strip()
        chain = str(item.get("chain") or "").strip()
        symbol = str(item.get("symbol") or "").strip()
        entry_price = item.get("entry_price") or item.get("entryPrice")
        if not token:
            monitored.append({"ok": False, "symbol": symbol, "chain": chain, "error": "Missing token address."})
            continue
        tape = aimeme_dexscreener_token(token, chain)
        pair = tape.get("best_pair") if tape.get("ok") else None
        decision = tape.get("market_decision") or {"action": "NO DATA", "reason": "No live DexScreener pair found."}
        if pair and entry_price not in ("", None):
            try:
                price = float(pair.get("priceUsd") or 0)
                entry = float(entry_price)
                if price and entry > 0:
                    decision = {**decision, "pnlPct": ((price - entry) / entry) * 100}
                    if decision["pnlPct"] <= -30:
                        decision = {**decision, "action": "EXIT", "reason": "Position is beyond the -30% trail threshold."}
                    elif decision["pnlPct"] >= 100:
                        decision = {**decision, "action": "TAKE_PROFIT", "reason": "Position is above +100%; AImeme doctrine scales 50%."}
            except (TypeError, ValueError):
                pass
        monitored.append(
            {
                "ok": bool(tape.get("ok") and pair),
                "symbol": symbol or ((pair or {}).get("baseToken") or {}).get("symbol"),
                "address": token,
                "chain": chain or (pair or {}).get("chainId"),
                "positionUsd": item.get("position_usd") or item.get("positionUsd"),
                "entryPrice": entry_price,
                "decision": decision,
                "market": pair,
            }
        )
    return {
        "ok": True,
        "source": "DexScreener live market monitor",
        "count": len(monitored),
        "coordinator_lane": "market_monitor",
        "items": monitored,
    }


def aimeme_portfolio_view(
    wallet_address: str = "",
    chain: str = "",
    include_scan: bool = False,
    max_candidates: int = 3,
) -> Dict[str, Any]:
    wallet = (wallet_address or _env("AIMEME_PORTFOLIO_WALLET") or _env("AIMEME_WALLET_ADDRESS")).strip()
    tracked_tokens = _aimeme_tracked_tokens_from_env()
    monitor = aimeme_market_monitor(tracked_tokens) if tracked_tokens else {
        "ok": True,
        "source": "AIMEME_TRACKED_TOKENS",
        "count": 0,
        "items": [],
    }
    positions = []
    total_position_usd = 0.0
    for item in (monitor.get("items") or [])[:50]:
        decision = item.get("decision") or {}
        market = item.get("market") or {}
        position_raw = item.get("positionUsd")
        try:
            total_position_usd += float(position_raw or 0)
        except (TypeError, ValueError):
            pass
        positions.append(
            {
                "symbol": item.get("symbol") or ((market.get("baseToken") or {}).get("symbol")),
                "chain": item.get("chain") or market.get("chainId"),
                "address": item.get("address"),
                "positionUsd": position_raw,
                "entryPrice": item.get("entryPrice"),
                "priceUsd": decision.get("priceUsd") or market.get("priceUsd"),
                "pnlPct": decision.get("pnlPct"),
                "liquidityUsd": decision.get("liquidityUsd") or market.get("liquidityUsd"),
                "action": decision.get("action"),
                "bucket": _portfolio_action_bucket(decision.get("action")),
                "reason": decision.get("reason"),
                "pairUrl": market.get("url"),
            }
        )
    watchlist = []
    discovery = None
    if include_scan:
        scan = aimeme_autonomous_memecoin_scan(chain=chain, max_candidates=max_candidates, include_paid_templates=True)
        discovery = scan.get("discovery")
        for item in (scan.get("candidates") or [])[: max(1, min(int(max_candidates or 3), 10))]:
            pool = item.get("pool") or {}
            best_pair = item.get("best_pair") or {}
            market_gate = item.get("market_gate") or {}
            safety_gate = item.get("safety_gate") or {}
            action = item.get("action") or "WATCH"
            watchlist.append(
                {
                    "name": pool.get("name"),
                    "network": item.get("network"),
                    "tokenAddress": item.get("token_address"),
                    "action": action,
                    "bucket": _portfolio_action_bucket(action),
                    "survivedFreeGates": item.get("survived_free_gates"),
                    "priceUsd": best_pair.get("priceUsd"),
                    "liquidityUsd": best_pair.get("liquidityUsd"),
                    "marketReason": market_gate.get("reason"),
                    "safetyReason": safety_gate.get("reason"),
                    "needsPaidSmartMoney": bool(item.get("paid_smart_money_next_step")),
                }
            )
    buckets = {"watch": 0, "buy_watch": 0, "trim": 0, "sell": 0, "avoid": 0}
    for row in positions + watchlist:
        bucket = row.get("bucket") or "watch"
        buckets[bucket] = buckets.get(bucket, 0) + 1
    return {
        "ok": bool(monitor.get("ok")),
        "source": "AImeme portfolio view",
        "timestamp": int(time.time()),
        "wallet": {
            "address": wallet or None,
            "configured": bool(wallet),
            "source": "AIMEME_PORTFOLIO_WALLET/AIMEME_WALLET_ADDRESS or wallet_address input",
            "fetch_enabled": False,
            "status": "Wallet-backed holdings are wired as the next source; until a wallet is supplied, positions come from AIMEME_TRACKED_TOKENS.",
        },
        "holdings_source": "AIMEME_TRACKED_TOKENS",
        "tracked_tokens_configured": bool(tracked_tokens),
        "position_count": len(positions),
        "watchlist_count": len(watchlist),
        "total_position_usd": total_position_usd,
        "buckets": buckets,
        "positions": positions,
        "watchlist": watchlist,
        "discovery": discovery,
        "execution_boundary": {
            "can_prepare_quotes": True,
            "can_sign_or_send": False,
            "reason": "Hermes can prepare Nuvolari quote payloads, but wallet EOA, exact token addresses, integer amount, and user signatures are required before execution.",
        },
    }


def aimeme_cron_cycle(max_candidates: int = 6, chain: str = "") -> Dict[str, Any]:
    scan = aimeme_autonomous_memecoin_scan(chain=chain, max_candidates=max_candidates, include_paid_templates=True)
    tracked_tokens = _aimeme_tracked_tokens_from_env()
    monitor = aimeme_market_monitor(tracked_tokens) if tracked_tokens else {"ok": True, "source": "AIMEME_TRACKED_TOKENS", "count": 0, "items": []}
    candidates = []
    for item in (scan.get("candidates") or [])[: max(1, min(int(max_candidates or 6), 10))]:
        pool = item.get("pool") or {}
        best_pair = item.get("best_pair") or {}
        candidates.append(
            {
                "network": item.get("network"),
                "token_address": item.get("token_address"),
                "name": pool.get("name"),
                "action": item.get("action"),
                "survived_free_gates": item.get("survived_free_gates"),
                "liquidityUsd": best_pair.get("liquidityUsd"),
                "priceUsd": best_pair.get("priceUsd"),
                "market_reason": (item.get("market_gate") or {}).get("reason"),
                "safety_reason": (item.get("safety_gate") or {}).get("reason"),
                "needs_paid_smart_money": bool(item.get("paid_smart_money_next_step")),
            }
        )
    monitored = []
    for item in (monitor.get("items") or [])[:20]:
        decision = item.get("decision") or {}
        market = item.get("market") or {}
        monitored.append(
            {
                "symbol": item.get("symbol"),
                "chain": item.get("chain"),
                "address": item.get("address"),
                "action": decision.get("action"),
                "reason": decision.get("reason"),
                "priceUsd": decision.get("priceUsd") or market.get("priceUsd"),
                "pnlPct": decision.get("pnlPct"),
                "liquidityUsd": decision.get("liquidityUsd") or market.get("liquidityUsd"),
            }
        )
    payload = {
        "ok": bool(scan.get("ok") and monitor.get("ok")),
        "source": "AImeme cron coordinator cycle",
        "timestamp": int(time.time()),
        "context_policy": "Compact summary only: no raw pair arrays, no long tool traces, no OpenRouter conversation history.",
        "coordinator_lanes": sorted(AIMEME_SUBAGENTS.keys()),
        "discovery": scan.get("discovery"),
        "candidate_decisions": candidates,
        "tracked_token_decisions": monitored,
        "wallet_execution_configured": False,
        "next_steps": [
            "Run paid AgentCash/Nansen enrichment only for candidates that survived free gates.",
            "Prepare Nuvolari quote only after exact token addresses, chain IDs, wallet EOA, and integer amount are supplied.",
            "Final buy remains blocked until a wallet/signature flow is connected.",
        ],
    }
    webhook_url = _env("AIMEME_DECISION_WEBHOOK_URL")
    if webhook_url:
        webhook = _json_request(webhook_url, method="POST", body=payload, timeout=20)
        payload["webhook_delivery"] = {"ok": webhook.get("ok"), "status": webhook.get("status"), "error": webhook.get("error")}
    return payload


def aimeme_cron_status() -> Dict[str, Any]:
    return {
        "ok": True,
        "schedule": "*/15 * * * *",
        "schedule_runner": "GitHub Actions",
        "schedule_note": "GitHub Actions calls the endpoint every 15 minutes. Vercel native crons are intentionally disabled for this project.",
        "endpoint": "/api/cron/aimeme",
        "tracked_tokens_env": "AIMEME_TRACKED_TOKENS",
        "tracked_tokens_configured": bool(_aimeme_tracked_tokens_from_env()),
        "webhook_env": "AIMEME_DECISION_WEBHOOK_URL",
        "webhook_configured": bool(_env("AIMEME_DECISION_WEBHOOK_URL")),
        "secret_env": "AIMEME_CRON_SECRET",
        "secret_required": bool(_env("AIMEME_CRON_SECRET")),
        "context_policy": "Cron emits compact decisions only; raw API payloads stay out of OpenRouter context.",
    }


def aimeme_rugcheck_token(token_address: str, detailed: bool = False) -> Dict[str, Any]:
    token = (token_address or "").strip()
    if not token:
        return {"ok": False, "needs_input": ["token_address"], "message": "Rugcheck requires a Solana token mint address."}
    endpoint = "report" if detailed else "report/summary"
    url = f"https://api.rugcheck.xyz/v1/tokens/{urllib.parse.quote(token)}/{endpoint}"
    response = _json_request(url, timeout=30)
    if not response.get("ok"):
        return response
    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    return {
        "ok": True,
        "source": url,
        "token_address": token,
        "summary": {
            "score": data.get("score"),
            "score_normalised": data.get("score_normalised") or data.get("scoreNormalized"),
            "riskLevel": data.get("riskLevel") or data.get("risk_level"),
            "risks": data.get("risks"),
            "markets": data.get("markets"),
        },
        "raw": data if detailed else None,
    }


def aimeme_goplus_token_security(chain: str, token_address: str) -> Dict[str, Any]:
    token = (token_address or "").strip()
    chain_id = _aimeme_chain_id(chain)
    if not token or not chain_id:
        return {
            "ok": False,
            "needs_input": ["chain", "token_address"],
            "message": "GoPlus token security requires an EVM chain ID/name and token contract address.",
            "received": {"chain": chain, "chainId": chain_id, "token_address": token},
        }
    query = urllib.parse.urlencode({"contract_addresses": token})
    url = f"https://api.gopluslabs.io/api/v1/token_security/{chain_id}?{query}"
    response = _json_request(url, timeout=30)
    if not response.get("ok"):
        return response
    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    result = data.get("result") if isinstance(data.get("result"), dict) else {}
    details = result.get(token.lower()) or result.get(token) or next(iter(result.values()), {})
    risk_fields = {
        "is_honeypot": details.get("is_honeypot"),
        "honeypot_with_same_creator": details.get("honeypot_with_same_creator"),
        "is_proxy": details.get("is_proxy"),
        "is_mintable": details.get("is_mintable"),
        "hidden_owner": details.get("hidden_owner"),
        "transfer_pausable": details.get("transfer_pausable"),
        "buy_tax": details.get("buy_tax"),
        "sell_tax": details.get("sell_tax"),
        "creator_address": details.get("creator_address"),
        "holder_count": details.get("holder_count"),
        "holders": details.get("holders", [])[:10] if isinstance(details.get("holders"), list) else [],
    }
    hard_flags = [
        field
        for field in ["is_honeypot", "honeypot_with_same_creator", "is_proxy", "is_mintable", "hidden_owner", "transfer_pausable"]
        if str(risk_fields.get(field)) == "1"
    ]
    for tax_field in ["buy_tax", "sell_tax"]:
        try:
            if float(risk_fields.get(tax_field) or 0) > 0.05:
                hard_flags.append(tax_field)
        except (TypeError, ValueError):
            pass
    return {
        "ok": True,
        "source": "https://api.gopluslabs.io/api/v1/token_security/{chain_id}",
        "chainId": chain_id,
        "token_address": token,
        "hard_flags": hard_flags,
        "verdict_hint": "NO BUY" if hard_flags else "SAFETY PASS",
        "risk_fields": risk_fields,
    }


def aimeme_geckoterminal_trending(network: str = "", duration: str = "1h", limit: int = 20) -> Dict[str, Any]:
    network_slug = AIMEME_GECKO_NETWORKS.get(str(network).strip().lower(), str(network).strip().lower())
    duration_value = duration if duration in {"5m", "1h", "6h", "24h"} else "1h"
    api_key = _env("COINGECKO_API_KEY")
    headers: Dict[str, str] = {}
    if api_key:
        base = "https://pro-api.coingecko.com/api/v3/onchain"
        headers["x-cg-pro-api-key"] = api_key
    else:
        base = "https://api.geckoterminal.com/api/v2"
    path = f"/networks/{urllib.parse.quote(network_slug)}/trending_pools" if network_slug else "/networks/trending_pools"
    query = urllib.parse.urlencode({"duration": duration_value})
    response = _json_request(f"{base}{path}?{query}", headers=headers, timeout=30)
    if not response.get("ok"):
        return response
    data = response.get("data", {}).get("data") if isinstance(response.get("data"), dict) else []
    data = data if isinstance(data, list) else []
    pools = []
    for item in data[: max(1, min(int(limit or 20), 50))]:
        attrs = item.get("attributes") or {}
        rel = item.get("relationships") or {}
        pools.append(
            {
                "id": item.get("id"),
                "network": (rel.get("network", {}).get("data") or {}).get("id"),
                "base_token_id": _gecko_relationship_id(item, "base_token"),
                "base_token_address": _gecko_token_address(item),
                "quote_token_id": _gecko_relationship_id(item, "quote_token"),
                "name": attrs.get("name"),
                "address": attrs.get("address"),
                "base_token_price_usd": attrs.get("base_token_price_usd"),
                "market_cap_usd": attrs.get("market_cap_usd"),
                "fdv_usd": attrs.get("fdv_usd"),
                "reserve_in_usd": attrs.get("reserve_in_usd"),
                "pool_created_at": attrs.get("pool_created_at"),
                "price_change_percentage": attrs.get("price_change_percentage"),
                "transactions": attrs.get("transactions"),
                "volume_usd": attrs.get("volume_usd"),
            }
        )
    return {
        "ok": True,
        "source": f"{base}{path}",
        "uses_coingecko_key": bool(api_key),
        "network": network_slug,
        "duration": duration_value,
        "matched_count": len(data),
        "pools": pools,
    }


def aimeme_autonomous_memecoin_scan(chain: str = "", max_candidates: int = 6, include_paid_templates: bool = True) -> Dict[str, Any]:
    workflow = aimeme_workflow_query("buy", "autonomous memecoin discovery")
    trending = aimeme_geckoterminal_trending(network=chain, duration="1h", limit=max_candidates)
    if not trending.get("ok"):
        return {
            "ok": False,
            "stage": "discovery",
            "message": "AImeme workflow is installed, but live GeckoTerminal/CoinGecko discovery failed.",
            "workflow": workflow,
            "discovery_error": trending,
            "agentcash_fallback": aimeme_agentcash_template("geckoterminal_trending", chain=chain),
        }
    candidates = []
    for pool in trending.get("pools", [])[: max(1, min(int(max_candidates or 6), 10))]:
        network = pool.get("network") or chain
        token = pool.get("base_token_address") or ""
        if not token:
            candidates.append({"pool": pool, "action": "NO BUY", "reason": "No base token address returned by discovery."})
            continue
        tape = aimeme_dexscreener_token(token, network)
        market_gate = tape.get("market_gate") or {}
        safety: Dict[str, Any]
        if str(network).lower() == "solana":
            safety = aimeme_rugcheck_token(token, detailed=False)
        else:
            safety = aimeme_goplus_token_security(network, token)
        safety_gate = _safety_gate_label(safety, str(network))
        if market_gate.get("label") == "NO BUY" or safety_gate.get("label") == "NO BUY":
            action = "NO BUY"
        elif market_gate.get("label") == "MARKET PASS" and safety_gate.get("label") == "PASS":
            action = "WATCH"
        else:
            action = "WATCH"
        survived_free_gates = action != "NO BUY"
        sm_template = (
            aimeme_agentcash_template("nansen_tgm_holders", chain=str(network), token_address=token)
            if include_paid_templates and survived_free_gates
            else None
        )
        candidates.append(
            {
                "token_address": token,
                "network": network,
                "pool": pool,
                "action": action,
                "survived_free_gates": survived_free_gates,
                "market_gate": market_gate,
                "safety_gate": safety_gate,
                "best_pair": tape.get("best_pair") if tape.get("ok") else None,
                "paid_smart_money_next_step": sm_template,
            }
        )
    return {
        "ok": True,
        "source": "AImeme autonomous workflow",
        "chain": chain,
        "coordinator": aimeme_subagent_manifest("autonomous memecoin scan"),
        "can_execute_wallet_buy": False,
        "wallet_boundary": "No wallet/signatures are configured. Hermes can autonomously find, gate, rank, and prepare buy instructions; actual buy execution stops at the wallet/signature boundary.",
        "workflow_installed": True,
        "discovery": {"source": trending.get("source"), "matched_count": trending.get("matched_count"), "uses_coingecko_key": trending.get("uses_coingecko_key")},
        "candidates": candidates,
    }


def aimeme_agentcash_template(action: str = "nansen_holdings", chain: str = "", token_address: str = "") -> Dict[str, Any]:
    action_key = (action or "nansen_holdings").strip().lower()
    chain_text = (chain or "<CHAIN>").strip() or "<CHAIN>"
    token = (token_address or "<TOKEN>").strip() or "<TOKEN>"
    chain_id = _aimeme_chain_id(chain) or "<CHAIN_ID>"
    templates = {
        "balance": ["npx agentcash@latest balance"],
        "accounts": ["npx agentcash@latest accounts"],
        "nansen_discover": [
            "npx agentcash@latest discover https://api.nansen.ai",
            "npx agentcash@latest check https://api.nansen.ai/api/v1/smart-money/holdings",
        ],
        "nansen_holdings": [
            "npx agentcash@latest discover https://api.nansen.ai",
            (
                "npx agentcash@latest fetch https://api.nansen.ai/api/v1/smart-money/holdings "
                "-m POST -b '{\"chains\":[\"" + chain_text + "\"],\"filters\":{\"token_age_days\":{\"max\":14},"
                "\"market_cap_usd\":{\"min\":100000,\"max\":2000000},\"liquidity_usd\":{\"min\":30000}}}'"
            ),
        ],
        "nansen_token_screener": [
            "npx agentcash@latest discover https://api.nansen.ai",
            (
                "npx agentcash@latest fetch https://api.nansen.ai/api/v1/token-screener "
                "-m POST -b '{\"chain\":\"" + chain_text + "\",\"filters\":{\"token_age_days\":{\"max\":14},"
                "\"market_cap_usd\":{\"min\":100000,\"max\":2000000},\"liquidity_usd\":{\"min\":30000},"
                "\"volume_6h_usd\":{\"min\":30000}}}'"
            ),
        ],
        "nansen_tgm_holders": [
            "npx agentcash@latest discover https://api.nansen.ai",
            (
                "npx agentcash@latest fetch https://api.nansen.ai/api/v1/tgm/holders "
                "-m POST -b '{\"chain\":\"" + chain_text + "\",\"token_address\":\"" + token + "\","
                "\"order_by\":\"ownership\",\"order\":\"desc\",\"limit\":25}'"
            ),
            (
                "npx agentcash@latest fetch https://api.nansen.ai/api/v1/tgm/holders "
                "-m POST -b '{\"chain\":\"" + chain_text + "\",\"token_address\":\"" + token + "\","
                "\"label_type\":\"smart_money\",\"limit\":25}'"
            ),
        ],
        "stablecrypto_contract_creation": [
            "npx agentcash@latest discover https://stablecrypto.dev",
            (
                "npx agentcash@latest fetch 'https://stablecrypto.dev/etherscan/contract/getcontractcreation"
                "?chainid=" + str(chain_id) + "&contractaddresses=" + token + "'"
            ),
        ],
        "hugen_token_safety": [
            "npx agentcash@latest fetch 'https://defi.hugen.tokyo/defi/token?chain=" + str(chain_id) + "&address=" + token + "'"
        ],
        "geckoterminal_trending": [
            "npx agentcash@latest search \"GeckoTerminal trending pools\"",
            "npx agentcash@latest fetch 'https://api.geckoterminal.com/api/v2/networks/trending_pools?duration=1h'",
        ],
    }
    commands = templates.get(action_key)
    if not commands:
        return {
            "ok": False,
            "needs_input": ["action"],
            "message": "Unknown AgentCash template action.",
            "available_actions": sorted(templates.keys()),
        }
    return {
        "ok": True,
        "source": "AImeme buy-workflow.md + pipeline.md",
        "action": action_key,
        "chain": chain,
        "chainId": chain_id,
        "token_address": token_address,
        "server_executes_paid_calls": False,
        "note": "These commands are generated for an AgentCash-funded shell. This Vercel API does not spend x402 funds or run paid Nansen calls by itself.",
        "commands": commands,
    }


TOOL_HANDLERS = {
    "nuvolari_swap_quote": nuvolari_swap_quote,
    "nuvolari_buy_asset": nuvolari_buy_asset,
    "nuvolari_yield_opportunities": nuvolari_yield_opportunities,
    "nuvolari_enter_yield": nuvolari_enter_yield,
    "nuvolari_add_liquidity": nuvolari_add_liquidity,
    "nuvolari_execution_quote": nuvolari_execution_quote,
    "nuvolari_execute_signed_supertransaction": nuvolari_execute_signed_supertransaction,
    "nuvolari_stablecoin_yields": nuvolari_stablecoin_yields,
    "nuvolari_raw_api": nuvolari_raw_api,
    "nuvolari_docs_query": nuvolari_docs_query,
    "nuvolari_context7_query": nuvolari_context7_query,
    "aimeme_workflow_query": aimeme_workflow_query,
    "aimeme_subagent_manifest": aimeme_subagent_manifest,
    "aimeme_dexscreener_token": aimeme_dexscreener_token,
    "aimeme_market_monitor": aimeme_market_monitor,
    "aimeme_portfolio_view": aimeme_portfolio_view,
    "aimeme_cron_cycle": aimeme_cron_cycle,
    "aimeme_cron_status": aimeme_cron_status,
    "aimeme_rugcheck_token": aimeme_rugcheck_token,
    "aimeme_goplus_token_security": aimeme_goplus_token_security,
    "aimeme_geckoterminal_trending": aimeme_geckoterminal_trending,
    "aimeme_autonomous_memecoin_scan": aimeme_autonomous_memecoin_scan,
    "aimeme_agentcash_template": aimeme_agentcash_template,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "nuvolari_swap_quote",
            "description": "Quote a Nuvolari swap route using /v1/execution/quote. Requires token contract addresses, numeric chain IDs, user EOA, and integer amount.",
            "parameters": {
                "type": "object",
                "properties": {
                    "input_asset": {"type": "string"},
                    "output_asset": {"type": "string"},
                    "amount": {"type": "string"},
                    "input_chain": {"type": "string"},
                    "output_chain": {"type": "string"},
                    "wallet_address": {"type": "string"},
                    "execute": {"type": "boolean"},
                },
                "required": ["input_asset", "output_asset", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_buy_asset",
            "description": "Quote buying an asset through Nuvolari using /v1/execution/quote. Requires token contract addresses, numeric chain ID, user EOA, and integer amount.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset": {"type": "string"},
                    "amount": {"type": "string"},
                    "pay_with_asset": {"type": "string"},
                    "chain": {"type": "string"},
                    "wallet_address": {"type": "string"},
                    "execute": {"type": "boolean"},
                },
                "required": ["asset", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_yield_opportunities",
            "description": "Fetch and filter live Nuvolari /v1/yields opportunities by underlying token symbol/address, chain, APY, and risk profile.",
            "parameters": {
                "type": "object",
                "properties": {
                    "underlying_asset": {"type": "string"},
                    "risk_profile": {"type": "string"},
                    "min_apy": {"type": "string"},
                    "chain": {"type": "string"},
                },
                "required": ["underlying_asset"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_enter_yield",
            "description": "Prepare or execute entry into a chosen Nuvolari yield strategy.",
            "parameters": {
                "type": "object",
                "properties": {
                    "strategy_id": {"type": "string"},
                    "input_asset": {"type": "string"},
                    "amount": {"type": "string"},
                    "wallet_address": {"type": "string"},
                    "execute": {"type": "boolean"},
                },
                "required": ["strategy_id", "input_asset", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_execution_quote",
            "description": "Generate a Nuvolari /v1/execution/quote supertransaction quote. Use this for swaps, deposits into selected yield vaults, and cross-chain routes after exact token/vault addresses are known.",
            "parameters": {
                "type": "object",
                "properties": {
                    "srcTokenAddress": {"type": "string"},
                    "destTokenAddress": {"type": "string"},
                    "srcChainId": {"type": "integer", "enum": [1, 143, 42161, 56, 8453, 999]},
                    "destChainId": {"type": "integer", "enum": [1, 143, 42161, 56, 8453, 999]},
                    "userAddress": {"type": "string"},
                    "amount": {"type": "string"},
                    "slippagePercentage": {"type": "number"},
                },
                "required": ["srcTokenAddress", "destTokenAddress", "srcChainId", "destChainId", "userAddress", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_execute_signed_supertransaction",
            "description": "Submit signed Nuvolari /v1/execution/execute payloads for a quoteId. Only call after user explicitly provides signatures.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quoteId": {"type": "string"},
                    "signatures": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["quoteId", "signatures"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_stablecoin_yields",
            "description": "Fetch and filter live Nuvolari /v1/yields/stablecoins opportunities by chain and APY.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chain": {"type": "string"},
                    "min_apy": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_add_liquidity",
            "description": "Prepare or execute a Nuvolari LP position with assets, fee tier, and range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_a": {"type": "string"},
                    "asset_b": {"type": "string"},
                    "amount_a": {"type": "string"},
                    "amount_b": {"type": "string"},
                    "chain": {"type": "string"},
                    "fee_tier": {"type": "string"},
                    "price_range": {"type": "string"},
                    "wallet_address": {"type": "string"},
                    "execute": {"type": "boolean"},
                },
                "required": ["asset_a", "asset_b", "amount_a"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_raw_api",
            "description": "Call a specific Nuvolari API path with authenticated headers when an exact endpoint is known.",
            "parameters": {
                "type": "object",
                "properties": {
                    "method": {"type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]},
                    "path": {"type": "string"},
                    "body": {"type": "object"},
                },
                "required": ["method", "path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_docs_query",
            "description": "Ask Nuvolari GitBook docs a specific question about swap, yield, liquidity, or shortcuts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["swap", "yield", "liquidity", "shortcuts"]},
                    "question": {"type": "string"},
                },
                "required": ["topic", "question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nuvolari_context7_query",
            "description": "Fetch Nuvolari.ai Context7 LLM documentation context from context7.com/websites/nuvolari_ai.",
            "parameters": {
                "type": "object",
                "properties": {"question": {"type": "string"}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_workflow_query",
            "description": "Read installed AImeme workflow references for memecoin discovery, buy/no-buy gates, AgentCash/Nansen enrichment, AutoWiki, or yield routing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["overview", "buy", "pipeline", "apis", "autowiki", "yield"]},
                    "question": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_subagent_manifest",
            "description": "Return the Hermes AImeme coordinator lanes/subagents and the policy for delegating discovery, tape, safety, smart-money, execution, and learning work.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_geckoterminal_trending",
            "description": "Fetch live GeckoTerminal/CoinGecko trending pools for AImeme primary memecoin discovery.",
            "parameters": {
                "type": "object",
                "properties": {
                    "network": {"type": "string", "description": "Optional network such as solana, eth, base, arbitrum, or bsc."},
                    "duration": {"type": "string", "enum": ["5m", "1h", "6h", "24h"]},
                    "limit": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_dexscreener_token",
            "description": "Fetch live DexScreener token tape/liquidity and run the AImeme cheap market gate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "token_address": {"type": "string"},
                    "chain": {"type": "string"},
                },
                "required": ["token_address"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_market_monitor",
            "description": "Monitor live DexScreener prices, liquidity, PnL, and tape for tracked AImeme candidates or positions and return enter/hold/trim/exit hints.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tokens": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "address": {"type": "string"},
                                "chain": {"type": "string"},
                                "symbol": {"type": "string"},
                                "entry_price": {"type": "string"},
                                "position_usd": {"type": "string"},
                            },
                            "required": ["address"],
                        },
                    },
                },
                "required": ["tokens"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_portfolio_view",
            "description": "Build the AImeme portfolio control view with tracked positions, watchlist candidates, watch/buy/trim/sell buckets, wallet status, and execution boundaries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "wallet_address": {"type": "string"},
                    "chain": {"type": "string"},
                    "include_scan": {"type": "boolean"},
                    "max_candidates": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_cron_status",
            "description": "Show the AImeme Vercel cron configuration, compact-context policy, tracked-token env vars, and webhook status.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_cron_cycle",
            "description": "Run one compact AImeme coordinator cycle: all-chain discovery, free gates, tracked-token price monitor, and optional webhook delivery. This is the same logic used by the cron endpoint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_candidates": {"type": "integer"},
                    "chain": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_rugcheck_token",
            "description": "Run Solana token safety via Rugcheck summary or full report.",
            "parameters": {
                "type": "object",
                "properties": {
                    "token_address": {"type": "string"},
                    "detailed": {"type": "boolean"},
                },
                "required": ["token_address"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_goplus_token_security",
            "description": "Run EVM token safety via GoPlus Token Security API for AImeme hard kill flags.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chain": {"type": "string", "description": "EVM chain name or ID such as eth, base, arbitrum, bsc, 1, 8453, 42161, 56."},
                    "token_address": {"type": "string"},
                },
                "required": ["chain", "token_address"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_autonomous_memecoin_scan",
            "description": "Run the executable AImeme autonomous discovery workflow: trending discovery, DexScreener tape, free safety gates, and paid Nansen/AgentCash next-step commands. Does not sign or execute buys.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chain": {"type": "string"},
                    "max_candidates": {"type": "integer"},
                    "include_paid_templates": {"type": "boolean"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "aimeme_agentcash_template",
            "description": "Generate exact AgentCash commands for paid Nansen, StableCrypto, Hugen, or GeckoTerminal AImeme workflow calls without executing paid spend.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": [
                            "balance",
                            "accounts",
                            "nansen_discover",
                            "nansen_holdings",
                            "nansen_token_screener",
                            "nansen_tgm_holders",
                            "stablecrypto_contract_creation",
                            "hugen_token_safety",
                            "geckoterminal_trending",
                        ],
                    },
                    "chain": {"type": "string"},
                    "token_address": {"type": "string"},
                },
            },
        },
    },
]

SYSTEM_PROMPT = """You are Gary's Hermes Nuvolari execution agent.
Use the Nuvolari tools whenever the user asks about swaps, buys, yield, LPs, routes, positions, or execution.
Use the AImeme tools whenever the user asks for memecoin discovery, what meme to buy, token safety, smart-money scans, AgentCash/Nansen, GeckoTerminal/CoinGecko, Rugcheck, GoPlus, DexScreener, AutoWiki, or the AImeme workflow.
Never invent filled trades. If execute is false, explain what is ready and what signature/input is still needed.
The Nuvolari REST API exposes /v1/yields, /v1/yields/stablecoins, /v1/execution/quote, and /v1/execution/execute.
For execution quotes, require exact token/vault contract addresses, numeric chain IDs, user EOA, and integer amount.
Quote responses return payloads/call data for the user's wallet to sign. You cannot sign. Only call execute after the user provides quoteId and signatures from the account flow.
If a live execution tool returns needs_configuration for a path env var, stop calling more tools and explain which env var must be set.
Before real execution, require an explicit user confirmation that includes asset, amount, chain, and wallet.
Use nuvolari_context7_query or docs_query when the exact Nuvolari behavior is unclear.

AImeme autonomous workflow:
- Act as a coordinator over specialized subagent lanes: discovery, tape, safety, smart_money, execution, and learning.
- If the user asks about subagents, skills, orchestration, coordination, or whether the workflow is wired, call aimeme_subagent_manifest.
- For "find a meme", "what should I buy", "run discovery", or similar requests, call aimeme_autonomous_memecoin_scan first.
- If the user does not specify a chain, scan all supported trending pools. Do not default memecoin discovery to Base.
- For "portfolio", "my positions", "watchlist", "what should I buy/sell", "how are my memes doing", "track prices", or position monitoring, call aimeme_portfolio_view. Use aimeme_market_monitor only when the user gives a specific token list.
- Keep watch, buy-review, trim, and sell decisions inside the portfolio/watchlist framing. Wallet holdings will come from the wallet source once configured; until then, use AIMEME_TRACKED_TOKENS plus live discovery candidates.
- For scheduled behavior, call aimeme_cron_status. GitHub Actions calls /api/cron/aimeme every 15 minutes; Vercel native crons are disabled so all schedules live in workflows.
- The workflow can autonomously discover, prefilter, safety-check, rank, and prepare a buy plan. It cannot autonomously sign or send a swap until a wallet/signature flow is connected.
- Use GeckoTerminal/CoinGecko trending for primary discovery, DexScreener for executable tape/liquidity, Rugcheck for Solana safety, and GoPlus for EVM safety.
- Use aimeme_agentcash_template for paid AgentCash/Nansen steps. Do not claim live Nansen smart-money results unless an actual live Nansen/AgentCash call result is present in the tool trace.
- A token is not a buy just because smart money appears. Return CLEAN BUY, TINY SPEC, WATCH, or NO BUY with the exact gate reason.
- If a candidate survives free gates, say the next paid step is Nansen TGM holders/smart-money enrichment and provide the generated AgentCash command or the missing paid-call result.
- If the user asks whether Hermes could buy autonomously, answer: yes for discovery + decision + quote preparation; no for final on-chain buy until wallet EOA, token addresses, integer amount, route quote, and user signatures are connected.

Response style:
- Return polished Markdown, not raw JSON.
- For yield scans, use: title, one compact context line, a top-opportunities table, 2-3 takeaways, and a "Prepare entry quote" section.
- For AImeme scans, use: title, autonomous capability line, candidate table, reject/watch reasons, paid enrichment needed, wallet/execution boundary.
- Keep yield tables to the best 6-8 rows unless the user asks for all results.
- Include APY as percentages, TVL as compact USD, and risk score as plain numbers.
- Include exact vault/output token addresses only when they help the next action; otherwise mention that the selected opportunity contains the address.
- Do not paste long strategy descriptions unless the user asks for due diligence.
- End with the exact missing inputs needed for the next quote: selected strategy, wallet EOA, source token address, destination vault/token address, chain IDs, and integer base-unit amount."""


def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "model": _openrouter_model(),
        "openrouter_max_tokens": _openrouter_max_tokens(),
        "openrouter_history_turns": _openrouter_history_turns(),
        "openrouter_transforms": _openrouter_transforms(),
        "openrouter_configured": bool(_env("OPENROUTER_API_KEY")),
        "nuvolari_credentials_configured": bool(_env("NUVOLARI_API_KEY") and _env("NUVOLARI_SECRET_API_KEY")),
        "nuvolari_base_url": _nuvolari_base_url(),
        "nuvolari_base_url_configured": bool(_nuvolari_base_url()),
        "nuvolari_base_url_source": "env" if _env("NUVOLARI_API_BASE_URL") else "default",
        "nuvolari_paths_configured": {
            "swap": bool(_configured_path("NUVOLARI_SWAP_PATH", "swap")),
            "buy": bool(_configured_path("NUVOLARI_BUY_PATH", "buy")),
            "yield": bool(_configured_path("NUVOLARI_YIELD_PATH", "yield")),
            "enter_yield": bool(_configured_path("NUVOLARI_ENTER_YIELD_PATH", "enter_yield")),
            "add_liquidity": bool(_configured_path("NUVOLARI_ADD_LIQUIDITY_PATH", "add_liquidity")),
            "execution_quote": bool(_configured_path("NUVOLARI_EXECUTION_QUOTE_PATH", "execution_quote")),
            "execution_execute": bool(_configured_path("NUVOLARI_EXECUTION_EXECUTE_PATH", "execution_execute")),
            "stablecoin_yields": bool(_configured_path("NUVOLARI_STABLECOIN_YIELDS_PATH", "stablecoin_yields")),
        },
        "aimeme": {
            "skill_installed": (AIMEME_ROOT / "SKILL.md").exists() or bool(AIMEME_EMBEDDED_REFERENCES),
            "workflow_installed": _aimeme_reference_available("buy-workflow.md"),
            "pipeline_installed": _aimeme_reference_available("pipeline.md"),
            "autowiki_installed": (AIMEME_REFERENCES / "autowiki").exists(),
            "embedded_fallback_available": bool(AIMEME_EMBEDDED_REFERENCES),
            "subagent_coordinator": True,
            "subagents": sorted(AIMEME_SUBAGENTS.keys()),
            "cron": aimeme_cron_status(),
            "portfolio": {
                "endpoint": "/api/portfolio",
                "wallet_env": "AIMEME_PORTFOLIO_WALLET",
                "tracked_tokens_env": "AIMEME_TRACKED_TOKENS",
                "wallet_configured": bool(_env("AIMEME_PORTFOLIO_WALLET") or _env("AIMEME_WALLET_ADDRESS")),
                "tracked_tokens_configured": bool(_aimeme_tracked_tokens_from_env()),
            },
            "live_tools": {
                "geckoterminal": True,
                "coingecko_key_configured": bool(_env("COINGECKO_API_KEY")),
                "dexscreener": True,
                "rugcheck": True,
                "goplus": True,
                "agentcash_templates": True,
            },
            "wallet_execution_configured": False,
        },
        "hermes_skills": [tool["function"]["name"] for tool in TOOLS if isinstance(tool, dict) and tool.get("function")],
        "context7_nuvolari": CONTEXT7_NUVOLARI,
    }


def _openrouter_chat(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    api_key = _env("OPENROUTER_API_KEY")
    if not api_key:
        return {"ok": False, "status": 500, "data": {"error": "OPENROUTER_API_KEY is not configured"}}
    body = {
        "model": _openrouter_model(),
        "messages": messages,
        "tools": TOOLS,
        "tool_choice": "auto",
        "parallel_tool_calls": False,
        "temperature": 0.2,
        "max_tokens": _openrouter_max_tokens(),
        "transforms": _openrouter_transforms(),
    }
    return _json_request(
        OPENROUTER_URL,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": f"https://{_env('VERCEL_URL')}" if _env("VERCEL_URL") else "https://hermes-agent-backend.vercel.app",
            "X-Title": "Hermes Nuvolari Agent",
        },
        body=body,
        timeout=60,
    )


def _coerce_tool_args(raw: str) -> Dict[str, Any]:
    try:
        parsed = json.loads(raw or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _configuration_reply(result: Dict[str, Any]) -> str:
    intended = result.get("intended_request") if isinstance(result.get("intended_request"), dict) else {}
    missing = result.get("needs_configuration", "NUVOLARI_API_BASE_URL")
    docs_source = result.get("docs_source")
    method = intended.get("method", "POST")
    path = intended.get("path") or intended.get("path_env", "")
    body = intended.get("body", {})
    if missing == "NUVOLARI_API_BASE_URL":
        first = "I cannot call live Nuvolari execution yet because `NUVOLARI_API_BASE_URL` is not configured in Vercel."
        request_line = f"`{method} {path}`"
    else:
        first = f"I did not call Nuvolari live because `{missing}` is not configured in Vercel."
        request_line = f"`{method} <{missing}>`"
    lines = [first, "", "The Nuvolari keys/base URL are present, and the agent prepared this request:", request_line]
    if body:
        lines.extend(["", "Payload:", json.dumps(body, indent=2)])
    if docs_source:
        lines.extend(["", "Context7/Nuvolari docs source:", docs_source])
    lines.extend(
        [
            "",
            f"Set `{missing}` to the exact Nuvolari REST path, then this same request will call the live API instead of stopping here.",
        ]
    )
    return "\n".join(lines)


def _nuvolari_error_reply(name: str, result: Dict[str, Any]) -> str:
    status = result.get("status")
    data = result.get("data") or result.get("error") or result
    lines = [
        f"Nuvolari returned an error while running `{name}`.",
    ]
    if status:
        lines.append(f"HTTP status: `{status}`")
    lines.extend(
        [
            "",
            "The OpenRouter tool call worked, but the Nuvolari endpoint/path or auth response needs attention.",
            "If the status is 404, set the matching Vercel path env var, for example `NUVOLARI_YIELD_PATH`, `NUVOLARI_SWAP_PATH`, `NUVOLARI_BUY_PATH`, or `NUVOLARI_ADD_LIQUIDITY_PATH`.",
            "",
            "Nuvolari response:",
            json.dumps(data, indent=2)[:3000],
        ]
    )
    return "\n".join(lines)


def _needs_input_reply(name: str, result: Dict[str, Any]) -> str:
    needed = result.get("needs_input") or []
    lines = [
        f"`{name}` is ready, but I need more input before calling Nuvolari.",
        "",
        result.get("message", "Required inputs are missing."),
    ]
    if needed:
        lines.extend(["", "Required inputs:", json.dumps(needed, indent=2)])
    if result.get("received"):
        lines.extend(["", "Prepared fields so far:", json.dumps(result["received"], indent=2)])
    if result.get("docs_source"):
        lines.extend(["", "API reference:", result["docs_source"]])
    return "\n".join(lines)


def _include_tool_trace(payload: Dict[str, Any]) -> bool:
    if payload.get("debug") or payload.get("include_trace"):
        return True
    return _env("NUVOLARI_DEBUG_TRACE").lower() in {"1", "true", "yes", "on"}


def _trace_summary(tool_trace: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    summary = []
    for entry in tool_trace:
        result = entry.get("result") if isinstance(entry.get("result"), dict) else {}
        summary.append(
            {
                "name": entry.get("name"),
                "ok": result.get("ok"),
                "source": result.get("source"),
                "matched_count": result.get("matched_count"),
                "needs_input": bool(result.get("needs_input")),
                "needs_configuration": result.get("needs_configuration"),
            }
        )
    return summary


def _chat_payload(
    request_payload: Dict[str, Any],
    reply: str,
    tool_trace: List[Dict[str, Any]],
    **extra: Any,
) -> Dict[str, Any]:
    response = {
        "reply": reply,
        "tool_trace": tool_trace if _include_tool_trace(request_payload) else [],
        "trace_summary": _trace_summary(tool_trace),
        "health": health(),
        "timestamp": int(time.time()),
    }
    response.update(extra)
    return response


def chat_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    message = str(payload.get("message") or "").strip()
    if not message:
        return _chat_payload(payload, "Send a message to the agent.", [])
    history = payload.get("history") if isinstance(payload.get("history"), list) else []
    execute = bool(payload.get("execute"))
    messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history[-_openrouter_history_turns():]:
        if isinstance(item, dict) and item.get("role") in {"user", "assistant"} and item.get("content"):
            messages.append({"role": item["role"], "content": str(item["content"])})
    messages.append({"role": "user", "content": message})

    tool_trace = []
    for _ in range(6):
        response = _openrouter_chat(messages)
        if not response.get("ok"):
            return _chat_payload(payload, "OpenRouter call failed.", tool_trace, error=response)
        choice = response["data"]["choices"][0]
        assistant_message = choice["message"]
        messages.append(assistant_message)
        tool_calls = assistant_message.get("tool_calls") or []
        if not tool_calls:
            return _chat_payload(payload, assistant_message.get("content", ""), tool_trace)
        for call in tool_calls:
            fn = call.get("function", {})
            name = fn.get("name", "")
            args = _coerce_tool_args(fn.get("arguments", ""))
            if name in {"nuvolari_swap_quote", "nuvolari_buy_asset", "nuvolari_enter_yield", "nuvolari_add_liquidity"}:
                args["execute"] = bool(args.get("execute")) and execute
            handler_fn = TOOL_HANDLERS.get(name)
            try:
                result = handler_fn(**args) if handler_fn else {"ok": False, "error": f"Unknown tool {name}"}
            except TypeError as exc:
                result = {"ok": False, "error": str(exc), "args": args}
            tool_trace.append({"name": name, "args": {k: v for k, v in args.items() if "key" not in k.lower()}, "result": result})
            if isinstance(result, dict) and result.get("needs_configuration"):
                return _chat_payload(payload, _configuration_reply(result), tool_trace)
            if isinstance(result, dict) and result.get("needs_input"):
                return _chat_payload(payload, _needs_input_reply(name, result), tool_trace)
            if name.startswith("nuvolari_") and name not in {"nuvolari_docs_query", "nuvolari_context7_query"} and isinstance(result, dict) and not result.get("ok", False):
                return _chat_payload(payload, _nuvolari_error_reply(name, result), tool_trace)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id"),
                    "name": name,
                    "content": json.dumps(result),
                }
            )
    return _chat_payload(payload, "I reached the tool-call limit. Narrow the request and try again.", tool_trace)


def docs_response(topic: str, ask: str = "") -> Dict[str, Any]:
    if ask:
        return nuvolari_docs_query(topic, ask)
    url = NUVOLARI_DOCS.get(topic.lower())
    if not url:
        return {"ok": False, "error": "Unknown docs topic"}
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "text/markdown,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 hermes-nuvolari-agent/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {"ok": True, "topic": topic, "markdown": resp.read().decode("utf-8", errors="replace")}
    except Exception as exc:
        return {"ok": False, "topic": topic, "error": str(exc)}


FRONTEND_HTML = """<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nuvolari Agent</title></head>
  <body><h1>Nuvolari Agent</h1><p>public/index.html is missing.</p></body>
</html>
"""


def frontend_html() -> str:
    public_index = Path(__file__).resolve().parent.parent / "public" / "index.html"
    try:
        if public_index.exists():
            return public_index.read_text(encoding="utf-8")
    except Exception:
        pass
    return FRONTEND_HTML


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        self._send(status, json.dumps(payload).encode("utf-8"), "application/json; charset=utf-8")

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("content-length") or "0")
        if not length:
            return {}
        try:
            parsed = json.loads(self.rfile.read(length).decode("utf-8"))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self) -> None:
        self._send(204, b"", "text/plain")

    def do_HEAD(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if path == "/api/health":
            self._send_json(200, health())
            return
        if path.startswith("/api/docs/"):
            topic = path.split("/")[-1]
            ask = urllib.parse.parse_qs(parsed.query).get("ask", [""])[0]
            self._send_json(200, docs_response(topic, ask))
            return
        if path == "/api/context7":
            question = urllib.parse.parse_qs(parsed.query).get("q", [""])[0]
            self._send_json(200, nuvolari_context7_query(question))
            return
        if path == "/api/cron/aimeme":
            if not _cron_authorized(self.headers):
                self._send_json(401, {"ok": False, "error": "Unauthorized cron request"})
                return
            qs = urllib.parse.parse_qs(parsed.query)
            chain = qs.get("chain", [""])[0]
            try:
                max_candidates = int(qs.get("max_candidates", ["6"])[0])
            except (TypeError, ValueError):
                max_candidates = 6
            self._send_json(200, aimeme_cron_cycle(max_candidates=max_candidates, chain=chain))
            return
        if path == "/api/portfolio":
            qs = urllib.parse.parse_qs(parsed.query)
            wallet = qs.get("wallet", [""])[0]
            chain = qs.get("chain", [""])[0]
            include_scan = qs.get("scan", ["0"])[0].lower() in {"1", "true", "yes"}
            try:
                max_candidates = int(qs.get("max_candidates", ["3"])[0])
            except (TypeError, ValueError):
                max_candidates = 3
            self._send_json(
                200,
                aimeme_portfolio_view(
                    wallet_address=wallet,
                    chain=chain,
                    include_scan=include_scan,
                    max_candidates=max_candidates,
                ),
            )
            return
        self._send(200, frontend_html().encode("utf-8"), "text/html; charset=utf-8")

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if path == "/api/chat":
            self._send_json(200, chat_response(self._read_json()))
            return
        self._send_json(404, {"ok": False, "error": "Not found"})
