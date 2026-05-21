export function env(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

export function intEnv(name: string, fallback: number): number {
  const value = Number(env(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers || {})
    },
    status: init?.status || 200
  });
}
