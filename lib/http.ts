type JsonOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

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
    return { ok: false, status: 0, text: "", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}
