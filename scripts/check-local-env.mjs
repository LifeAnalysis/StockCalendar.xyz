import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILES = [
  ".env.local",
  ".env",
  ".vercel/.env.development.local",
  ".vercel/.env.production.local"
];

const REQUIRED = [
  {
    name: "ROBINHOOD_CHAIN_RPC_URL",
    reason: "checks Robinhood Chain connectivity and prepares stock-token quotes"
  },
  {
    name: "OPENROUTER_API_KEY",
    reason: "powers Hermes chat responses"
  }
];

const REQUIRED_ONE_OF = [
  {
    names: ["NUVOLARI_API_KEY", "NUVOLARI_SECRET_API_KEY"],
    reason: "authorizes Nuvolari quote preparation"
  }
];

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    values[match[1]] = stripQuotes(match[2]);
  }
  return values;
}

const loaded = {};
const sources = {};

for (const [name, value] of Object.entries(process.env)) {
  if (typeof value === "string") {
    loaded[name] = value.trim();
    sources[name] = "shell";
  }
}

for (const relativePath of ENV_FILES) {
  const absolutePath = path.join(ROOT, relativePath);
  const parsed = parseEnvFile(absolutePath);
  for (const [name, value] of Object.entries(parsed)) {
    if (!(name in loaded)) {
      loaded[name] = value;
      sources[name] = relativePath;
    }
  }
}

const failures = [];

for (const item of REQUIRED) {
  if (!loaded[item.name]) {
    failures.push(`${item.name} - ${item.reason}`);
  }
}

for (const item of REQUIRED_ONE_OF) {
  if (!item.names.some((name) => Boolean(loaded[name]))) {
    failures.push(`${item.names.join(" or ")} - ${item.reason}`);
  }
}

if (failures.length) {
  console.error("Local env is not ready. Missing or empty:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error("");
  console.error("Put real values in .env.local or export them before running npm run dev.");
  console.error("Vercel encrypted/sensitive env vars may pull as empty strings; empty values are treated as missing.");
  process.exit(1);
}

console.log("Local env ready:");
for (const name of [
  "ROBINHOOD_CHAIN_RPC_URL",
  "OPENROUTER_API_KEY",
  "NUVOLARI_API_KEY",
  "NUVOLARI_SECRET_API_KEY"
]) {
  if (loaded[name]) {
    console.log(`- ${name}: loaded from ${sources[name] || "unknown"}`);
  }
}
