import { spawn } from "node:child_process";

type JsonOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

function curlFallbackEnabled(options: JsonOptions) {
  return process.env.VERCEL !== "1" && process.env.HTTP_CURL_FALLBACK !== "false";
}

function quoteCurlConfig(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

async function fetchWithCurl(url: string, options: JsonOptions): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const headers = {
    Accept: "application/json",
    "User-Agent": "hermes-next-agent/2.0",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };
  const config = [
    "silent",
    "show-error",
    "location",
    `max-time = ${Math.max(1, Math.ceil((options.timeoutMs || 20000) / 1000))}`,
    `request = ${quoteCurlConfig(options.method || "GET")}`,
    `url = ${quoteCurlConfig(url)}`,
    `write-out = ${quoteCurlConfig("\n%{http_code}")}`,
    ...Object.entries(headers).map(([key, value]) => `header = ${quoteCurlConfig(`${key}: ${value}`)}`),
    options.body ? `data = ${quoteCurlConfig(JSON.stringify(options.body))}` : ""
  ].filter(Boolean).join("\n");

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn("curl", ["-K", "-"], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`curl fallback timeout after ${options.timeoutMs || 20000}ms`));
    }, options.timeoutMs || 20000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
      if (out.length > 8 * 1024 * 1024) {
        child.kill("SIGTERM");
        reject(new Error("curl fallback response exceeded 8MB"));
      }
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err.trim() || `curl exited with code ${code}`));
    });
    child.stdin.end(config);
  });

  const splitAt = stdout.lastIndexOf("\n");
  const text = splitAt >= 0 ? stdout.slice(0, splitAt) : stdout;
  const status = Number(splitAt >= 0 ? stdout.slice(splitAt + 1).trim() : 0);
  const ok = status >= 200 && status < 300;
  return { ok, status, text, error: ok ? undefined : `${status} curl_fallback_failed` };
}

export async function fetchJson<T = unknown>(url: string, options: JsonOptions = {}): Promise<{
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20000);

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "hermes-next-agent/2.0",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store"
    });
    const text = await res.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      data = { text } as T;
    }
    let error: string | undefined;
    if (!res.ok) {
      if (data && typeof data === "object" && "error" in data) {
        error = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
      } else {
        error = `${res.status} ${res.statusText}`.trim();
      }
    }
    return { ok: res.ok, status: res.status, data, error };
  } catch (error) {
    if (curlFallbackEnabled(options)) {
      try {
        const fallback = await fetchWithCurl(url, options);
        let data: T | undefined;
        try {
          data = fallback.text ? (JSON.parse(fallback.text) as T) : undefined;
        } catch {
          data = { text: fallback.text } as T;
        }
        let fallbackError = fallback.error;
        if (!fallback.ok && data && typeof data === "object" && "error" in data) {
          fallbackError = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        }
        return { ok: fallback.ok, status: fallback.status, data, error: fallbackError };
      } catch (fallbackError) {
        return {
          ok: false,
          status: 0,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        };
      }
    }
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(url: string, options: JsonOptions = {}): Promise<{
  ok: boolean;
  status: number;
  text: string;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20000);

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Accept: "text/plain,text/csv,*/*",
        "User-Agent": "hermes-next-agent/2.0",
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store"
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, error: res.ok ? undefined : `${res.status} ${res.statusText}`.trim() };
  } catch (error) {
    if (curlFallbackEnabled(options)) {
      try {
        const fallback = await fetchWithCurl(url, options);
        return fallback;
      } catch (fallbackError) {
        return {
          ok: false,
          status: 0,
          text: "",
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        };
      }
    }
    return { ok: false, status: 0, text: "", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}
