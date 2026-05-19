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
CONTEXT7_NUVOLARI = "https://context7.com/websites/nuvolari_ai/llms.txt"
NUVOLARI_DOCS = {
    "swap": "https://docs.nuvolari.ai/execution-engine/swap.md",
    "yield": "https://docs.nuvolari.ai/execution-engine/yield.md",
    "liquidity": "https://docs.nuvolari.ai/execution-engine/add-liquidity.md",
    "shortcuts": "https://docs.nuvolari.ai/execution-engine/shortcuts.md",
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
    req_headers = {"Accept": "application/json", **(headers or {})}
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


def nuvolari_swap_quote(
    input_asset: str,
    output_asset: str,
    amount: str,
    input_chain: str = "",
    output_chain: str = "",
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    return _nuvolari_call(
        _env("NUVOLARI_SWAP_PATH") or "/swap",
        {
            "input_asset": input_asset,
            "output_asset": output_asset,
            "amount": amount,
            "input_chain": input_chain,
            "output_chain": output_chain,
            "wallet_address": wallet_address,
            "execute": bool(execute),
        },
    )


def nuvolari_buy_asset(
    asset: str,
    amount: str,
    pay_with_asset: str = "USDC",
    chain: str = "",
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    return _nuvolari_call(
        _env("NUVOLARI_BUY_PATH") or "/buy",
        {
            "asset": asset,
            "amount": amount,
            "pay_with_asset": pay_with_asset,
            "chain": chain,
            "wallet_address": wallet_address,
            "execute": bool(execute),
        },
    )


def nuvolari_yield_opportunities(
    underlying_asset: str,
    risk_profile: str = "balanced",
    min_apy: str = "",
    chain: str = "",
) -> Dict[str, Any]:
    return _nuvolari_call(
        _env("NUVOLARI_YIELD_PATH") or "/yield/opportunities",
        {
            "underlying_asset": underlying_asset,
            "risk_profile": risk_profile,
            "min_apy": min_apy,
            "chain": chain,
        },
    )


def nuvolari_enter_yield(
    strategy_id: str,
    input_asset: str,
    amount: str,
    wallet_address: str = "",
    execute: bool = False,
) -> Dict[str, Any]:
    return _nuvolari_call(
        _env("NUVOLARI_ENTER_YIELD_PATH") or "/yield/enter",
        {
            "strategy_id": strategy_id,
            "input_asset": input_asset,
            "amount": amount,
            "wallet_address": wallet_address,
            "execute": bool(execute),
        },
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
    return _nuvolari_call(
        _env("NUVOLARI_ADD_LIQUIDITY_PATH") or "/liquidity/add",
        {
            "asset_a": asset_a,
            "asset_b": asset_b,
            "amount_a": amount_a,
            "amount_b": amount_b,
            "chain": chain,
            "fee_tier": fee_tier,
            "price_range": price_range,
            "wallet_address": wallet_address,
            "execute": bool(execute),
        },
    )


def nuvolari_raw_api(method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return _nuvolari_call(path, body or {}, method=method)


def nuvolari_docs_query(topic: str, question: str) -> Dict[str, Any]:
    url = NUVOLARI_DOCS.get(topic.lower(), NUVOLARI_DOCS["shortcuts"])
    ask_url = f"{url}?ask={urllib.parse.quote(question)}"
    req = urllib.request.Request(ask_url, headers={"Accept": "text/markdown"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {"ok": True, "topic": topic, "answer": resp.read().decode("utf-8", errors="replace")}
    except Exception as exc:
        return {"ok": False, "topic": topic, "error": str(exc), "url": ask_url}


def nuvolari_context7_query(question: str = "") -> Dict[str, Any]:
    req = urllib.request.Request(CONTEXT7_NUVOLARI, headers={"Accept": "text/plain"})
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
Before real execution, require an explicit user confirmation that includes asset, amount, chain, and wallet.
Use nuvolari_context7_query or docs_query when the exact Nuvolari behavior is unclear."""


def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "model": _env("OPENROUTER_MODEL") or DEFAULT_MODEL,
        "openrouter_configured": bool(_env("OPENROUTER_API_KEY")),
        "nuvolari_credentials_configured": bool(_env("NUVOLARI_API_KEY") and _env("NUVOLARI_SECRET_API_KEY")),
        "nuvolari_base_url_configured": bool(_env("NUVOLARI_API_BASE_URL")),
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
    req = urllib.request.Request(url, headers={"Accept": "text/markdown"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {"ok": True, "topic": topic, "markdown": resp.read().decode("utf-8", errors="replace")}
    except Exception as exc:
        return {"ok": False, "topic": topic, "error": str(exc)}


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
        index_path = Path(__file__).resolve().parents[1] / "public" / "index.html"
        self._send(200, index_path.read_bytes(), "text/html; charset=utf-8")

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if path == "/api/chat":
            self._send_json(200, chat_response(self._read_json()))
            return
        self._send_json(404, {"ok": False, "error": "Not found"})
