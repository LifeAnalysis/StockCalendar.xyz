import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, List, Optional


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "deepseek/deepseek-v4-flash"
CONTEXT7_NUVOLARI = "https://context7.com/websites/nuvolari_ai/llms.txt"
NUVOLARI_DOCS = {
    "swap": "https://docs.nuvolari.ai/execution-engine/swap.md",
    "yield": "https://docs.nuvolari.ai/execution-engine/yield.md",
    "liquidity": "https://docs.nuvolari.ai/execution-engine/add-liquidity.md",
    "shortcuts": "https://docs.nuvolari.ai/execution-engine/shortcuts.md",
    "agents": "https://docs.nuvolari.ai/execution-engine/agents.md",
    "insights": "https://docs.nuvolari.ai/ai-engine/insights.md",
}


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


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


def _nuvolari_headers() -> Dict[str, str]:
    api_key = _env("NUVOLARI_API_KEY")
    secret = _env("NUVOLARI_SECRET_API_KEY")
    headers = {
        "User-Agent": "hermes-nuvolari-agent/1.0",
        "X-Nuvolari-Client": "Gary",
    }
    if api_key:
        headers["X-API-Key"] = api_key
        headers["X-Nuvolari-API-Key"] = api_key
    if secret:
        headers["X-API-Secret"] = secret
        headers["X-Nuvolari-API-Secret"] = secret
        headers["Authorization"] = f"Bearer {secret}"
    return headers


def _nuvolari_call(path: str, payload: Dict[str, Any], method: str = "POST") -> Dict[str, Any]:
    base_url = _env("NUVOLARI_API_BASE_URL").rstrip("/")
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
    return _json_request(
        f"{base_url}/{path.lstrip('/')}",
        method=method.upper(),
        headers=_nuvolari_headers(),
        body=payload if method.upper() != "GET" else None,
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
        "input_asset": input_asset,
        "output_asset": output_asset,
        "amount": amount,
        "input_chain": input_chain,
        "output_chain": output_chain,
        "wallet_address": wallet_address,
        "execute": bool(execute),
    }
    path = _env("NUVOLARI_SWAP_PATH")
    if not path:
        return _missing_path("NUVOLARI_SWAP_PATH", "swap quotes/execution", payload, "swap")
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
        "asset": asset,
        "amount": amount,
        "pay_with_asset": pay_with_asset,
        "chain": chain,
        "wallet_address": wallet_address,
        "execute": bool(execute),
    }
    path = _env("NUVOLARI_BUY_PATH")
    if not path:
        return _missing_path("NUVOLARI_BUY_PATH", "buy execution", payload, "swap")
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
    payload = {
        "underlying_asset": underlying_asset,
        "risk_profile": risk_profile,
        "min_apy": min_apy,
        "chain": chain,
    }
    path = _env("NUVOLARI_YIELD_PATH")
    if not path:
        return _missing_path("NUVOLARI_YIELD_PATH", "yield opportunity discovery", payload, "yield")
    return _nuvolari_call(
        path,
        payload,
    )


def nuvolari_enter_yield(
    strategy_id: str,
    input_asset: str,
    amount: str,
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    payload = {
        "strategy_id": strategy_id,
        "input_asset": input_asset,
        "amount": amount,
        "wallet_address": wallet_address,
        "execute": bool(execute),
    }
    path = _env("NUVOLARI_ENTER_YIELD_PATH")
    if not path:
        return _missing_path("NUVOLARI_ENTER_YIELD_PATH", "yield strategy entry", payload, "yield")
    return _nuvolari_call(
        path,
        payload,
    )


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
    path = _env("NUVOLARI_ADD_LIQUIDITY_PATH")
    if not path:
        return _missing_path("NUVOLARI_ADD_LIQUIDITY_PATH", "add liquidity execution", payload, "liquidity")
    return _nuvolari_call(
        path,
        payload,
    )


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


TOOL_HANDLERS = {
    "nuvolari_swap_quote": nuvolari_swap_quote,
    "nuvolari_buy_asset": nuvolari_buy_asset,
    "nuvolari_yield_opportunities": nuvolari_yield_opportunities,
    "nuvolari_enter_yield": nuvolari_enter_yield,
    "nuvolari_add_liquidity": nuvolari_add_liquidity,
    "nuvolari_raw_api": nuvolari_raw_api,
    "nuvolari_docs_query": nuvolari_docs_query,
    "nuvolari_context7_query": nuvolari_context7_query,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "nuvolari_swap_quote",
            "description": "Quote or prepare a Nuvolari swap route across assets/chains. Use execute=false unless the user explicitly asks to execute.",
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
            "description": "Buy an asset through Nuvolari using another asset as payment.",
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
            "description": "Find Nuvolari risk-adjusted yield opportunities by underlying asset, APY, chain, and risk profile.",
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
]

SYSTEM_PROMPT = """You are Gary's Hermes Nuvolari execution agent.
Use the Nuvolari tools whenever the user asks about swaps, buys, yield, LPs, routes, positions, or execution.
Never invent filled trades. If execute is false or the Nuvolari API base URL is missing, explain what is ready and what config is missing.
Context7 currently publishes Nuvolari product/documentation flows, not REST endpoint paths. Do not invent API paths.
If a live execution tool returns needs_configuration for a path env var, stop calling more tools and explain which env var must be set.
Before real execution, require an explicit user confirmation that includes asset, amount, chain, and wallet.
Use nuvolari_context7_query or docs_query when the exact Nuvolari behavior is unclear."""


def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "model": _env("OPENROUTER_MODEL") or DEFAULT_MODEL,
        "openrouter_configured": bool(_env("OPENROUTER_API_KEY")),
        "nuvolari_credentials_configured": bool(_env("NUVOLARI_API_KEY") and _env("NUVOLARI_SECRET_API_KEY")),
        "nuvolari_base_url_configured": bool(_env("NUVOLARI_API_BASE_URL")),
        "nuvolari_paths_configured": {
            "swap": bool(_env("NUVOLARI_SWAP_PATH")),
            "buy": bool(_env("NUVOLARI_BUY_PATH")),
            "yield": bool(_env("NUVOLARI_YIELD_PATH")),
            "enter_yield": bool(_env("NUVOLARI_ENTER_YIELD_PATH")),
            "add_liquidity": bool(_env("NUVOLARI_ADD_LIQUIDITY_PATH")),
        },
        "context7_nuvolari": CONTEXT7_NUVOLARI,
    }


def _openrouter_chat(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    api_key = _env("OPENROUTER_API_KEY")
    if not api_key:
        return {"ok": False, "status": 500, "data": {"error": "OPENROUTER_API_KEY is not configured"}}
    return _json_request(
        OPENROUTER_URL,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": f"https://{_env('VERCEL_URL')}" if _env("VERCEL_URL") else "https://hermes-agent-backend.vercel.app",
            "X-Title": "Hermes Nuvolari Agent",
        },
        body={
            "model": _env("OPENROUTER_MODEL") or DEFAULT_MODEL,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",
            "parallel_tool_calls": False,
            "temperature": 0.2,
        },
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


def chat_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    message = str(payload.get("message") or "").strip()
    if not message:
        return {"reply": "Send a message to the agent.", "tool_trace": [], "health": health()}
    history = payload.get("history") if isinstance(payload.get("history"), list) else []
    execute = bool(payload.get("execute"))
    messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history[-12:]:
        if isinstance(item, dict) and item.get("role") in {"user", "assistant"} and item.get("content"):
            messages.append({"role": item["role"], "content": str(item["content"])})
    messages.append({"role": "user", "content": message})

    tool_trace = []
    for _ in range(6):
        response = _openrouter_chat(messages)
        if not response.get("ok"):
            return {"reply": "OpenRouter call failed.", "error": response, "tool_trace": tool_trace, "health": health()}
        choice = response["data"]["choices"][0]
        assistant_message = choice["message"]
        messages.append(assistant_message)
        tool_calls = assistant_message.get("tool_calls") or []
        if not tool_calls:
            return {
                "reply": assistant_message.get("content", ""),
                "tool_trace": tool_trace,
                "health": health(),
                "timestamp": int(time.time()),
            }
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
            if isinstance(result, dict) and result.get("needs_configuration") == "NUVOLARI_API_BASE_URL":
                return {
                    "reply": _configuration_reply(result),
                    "tool_trace": tool_trace,
                    "health": health(),
                    "timestamp": int(time.time()),
                }
            if name.startswith("nuvolari_") and name not in {"nuvolari_docs_query", "nuvolari_context7_query"} and isinstance(result, dict) and not result.get("ok", False):
                return {
                    "reply": _nuvolari_error_reply(name, result),
                    "tool_trace": tool_trace,
                    "health": health(),
                    "timestamp": int(time.time()),
                }
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id"),
                    "name": name,
                    "content": json.dumps(result),
                }
            )
    return {"reply": "I reached the tool-call limit. Narrow the request and try again.", "tool_trace": tool_trace, "health": health()}


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
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hermes Nuvolari Agent</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #07100d; color: #edf7ef; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background:
      radial-gradient(circle at 18% 16%, rgba(104, 255, 178, .16), transparent 28%),
      radial-gradient(circle at 88% 6%, rgba(93, 204, 255, .12), transparent 24%),
      linear-gradient(135deg, #07100d 0%, #0c1814 48%, #080d0f 100%); }
    body::before { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .24; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 44px 44px; mask-image: linear-gradient(to bottom, #000, transparent 78%); }
    .shell { position: relative; z-index: 1; min-height: 100vh; display: grid; grid-template-columns: 340px 1fr; }
    aside { border-right: 1px solid rgba(237,247,239,.13); padding: 26px; background: rgba(8, 20, 16, .82); backdrop-filter: blur(18px); box-shadow: 18px 0 70px rgba(0,0,0,.22); }
    main { padding: 28px; display: grid; grid-template-rows: auto 1fr auto; gap: 18px; max-height: 100vh; }
    .kicker { margin-bottom: 14px; color: #7ee787; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0; } p { color: rgba(237,247,239,.72); line-height: 1.5; }
    .status, .actions { display: grid; gap: 8px; margin-top: 20px; }
    .pill { border: 1px solid rgba(237,247,239,.14); border-radius: 8px; padding: 10px 12px; color: rgba(237,247,239,.8); font-size: 13px; background: rgba(255,255,255,.035); }
    .ok { color: #7ee787; } .warn { color: #ffcc66; }
    button, textarea, input { font: inherit; border-radius: 8px; border: 1px solid rgba(237,247,239,.16); background: rgba(17,29,25,.86); color: #edf7ef; }
    button { padding: 11px 12px; cursor: pointer; text-align: left; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
    button:hover { border-color: rgba(126,231,135,.55); background: rgba(19,42,33,.96); transform: translateY(-1px); }
    .messages { overflow: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 6px; }
    .msg { border: 1px solid rgba(237,247,239,.12); border-radius: 10px; padding: 15px; background: rgba(255,255,255,.04); white-space: pre-wrap; box-shadow: 0 12px 32px rgba(0,0,0,.16); animation: rise .22s ease both; }
    .msg.user { border-color: rgba(126,231,135,.25); background: rgba(126,231,135,.06); }
    .msg .role { display: block; color: rgba(237,247,239,.52); font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
    .composer { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: end; }
    textarea { min-height: 76px; resize: vertical; padding: 13px; outline: none; }
    textarea:focus { border-color: rgba(126,231,135,.72); box-shadow: 0 0 0 4px rgba(126,231,135,.10); }
    .send { min-width: 116px; text-align: center; background: linear-gradient(135deg, #e8ffec, #93f7b7); color: #0b1612; border: 0; font-weight: 800; }
    .trace { margin-top: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: rgba(237,247,239,.65); overflow: auto; }
    label { display: flex; gap: 8px; align-items: center; color: rgba(237,247,239,.75); font-size: 13px; margin-top: 12px; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 820px) { .shell { grid-template-columns: 1fr; } aside { border-right: 0; border-bottom: 1px solid rgba(237,247,239,.12); } main { max-height: none; min-height: 70vh; padding: 18px; } .composer { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="kicker">Hermes x Nuvolari</div>
      <h1>Hermes Nuvolari Agent</h1>
      <p>Ask for swaps, buys, yield routes, LP setup, or Nuvolari docs. Real execution is gated behind explicit confirmation.</p>
      <div class="status" id="status"></div>
      <label><input type="checkbox" id="execute" /> allow execution calls for this message</label>
      <div class="actions">
        <button data-prompt="Find USDC yield opportunities for a balanced profile on Base.">USDC yield scan</button>
        <button data-prompt="Quote swapping 100 USDC into ETH on Base. Do not execute.">Swap quote</button>
        <button data-prompt="Show me how Nuvolari add liquidity works and what inputs you need from me.">LP setup</button>
        <button data-prompt="Buy 0.05 ETH using USDC on Base. Prepare only, do not execute.">Buy ETH</button>
        <button data-prompt="Use Context7 Nuvolari docs and explain which Nuvolari execution tools you can call.">Context7 docs</button>
      </div>
    </aside>
    <main>
      <div><h1>Command Center</h1><p id="subtitle">Model: deepseek/deepseek-v4-flash via OpenRouter</p></div>
      <section class="messages" id="messages"></section>
      <form class="composer" id="form">
        <textarea id="input" placeholder="Example: quote swapping 250 USDC into ETH on Base, then show the route provider."></textarea>
        <button class="send" type="submit">Send</button>
      </form>
    </main>
  </div>
  <script>
    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("input");
    const executeEl = document.getElementById("execute");
    const statusEl = document.getElementById("status");
    const subtitle = document.getElementById("subtitle");
    const history = [];
    function esc(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
    function addMessage(role, content, trace) {
      const div = document.createElement("div");
      div.className = `msg ${role}`;
      div.innerHTML = `<span class="role">${role}</span>${esc(content || "")}`;
      if (trace && trace.length) { const pre = document.createElement("pre"); pre.className = "trace"; pre.textContent = JSON.stringify(trace, null, 2); div.appendChild(pre); }
      messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    async function loadHealth() {
      const h = await (await fetch("/api/health")).json();
      subtitle.textContent = `Model: ${h.model} via OpenRouter`;
        statusEl.innerHTML = `
        <div class="pill ${h.openrouter_configured ? "ok" : "warn"}">OpenRouter ${h.openrouter_configured ? "configured" : "missing"}</div>
        <div class="pill ${h.nuvolari_credentials_configured ? "ok" : "warn"}">Nuvolari keys ${h.nuvolari_credentials_configured ? "configured" : "missing"}</div>
        <div class="pill ${h.nuvolari_base_url_configured ? "ok" : "warn"}">Nuvolari API URL ${h.nuvolari_base_url_configured ? "configured" : "needed"}</div>
        <div class="pill ${h.nuvolari_paths_configured && h.nuvolari_paths_configured.yield ? "ok" : "warn"}">Nuvolari REST paths ${h.nuvolari_paths_configured && h.nuvolari_paths_configured.yield ? "configured" : "need exact docs"}</div>
        <div class="pill ok">Context7 Nuvolari connected</div>`;
    }
    async function send(message) {
      addMessage("user", message); history.push({ role: "user", content: message }); inputEl.value = ""; addMessage("assistant", "Working...");
      const pending = messagesEl.lastChild;
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history: history.slice(0, -1), execute: executeEl.checked }) });
        const data = await res.json(); pending.remove(); addMessage("assistant", data.reply || JSON.stringify(data), data.tool_trace); history.push({ role: "assistant", content: data.reply || "" }); loadHealth();
      } catch (err) { pending.remove(); addMessage("assistant", `Request failed: ${err.message}`); }
    }
    document.getElementById("form").addEventListener("submit", event => { event.preventDefault(); const message = inputEl.value.trim(); if (message) send(message); });
    document.querySelectorAll("[data-prompt]").forEach(btn => btn.addEventListener("click", () => { inputEl.value = btn.dataset.prompt; inputEl.focus(); }));
    addMessage("assistant", "Ready. Ask for a Nuvolari swap, buy, yield route, or LP action."); loadHealth();
  </script>
</body>
</html>"""


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
        self._send(200, FRONTEND_HTML.encode("utf-8"), "text/html; charset=utf-8")

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if path == "/api/chat":
            self._send_json(200, chat_response(self._read_json()))
            return
        self._send_json(404, {"ok": False, "error": "Not found"})
