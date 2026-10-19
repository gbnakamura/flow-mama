import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const env = { ...process.env, NODE_ENV: "development" };
// Explicit empty values take precedence over Next.js .env files.
const example = readFileSync(".env.example", "utf8");
for (const line of example.split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
  if (match) env[match[1]] = "";
}
for (const key of Object.keys(env)) {
  if (/^(NEXT_PUBLIC_SUPABASE_|SUPABASE_|STRIPE_|RESEND_|VERCEL_)/.test(key)) env[key] = "";
}
for (const key of ["VERCEL_PROJECT_ID", "VERCEL_TEAM_ID"]) env[key] = "";
env.APP_URL = "http://127.0.0.1:4173";
console.log("Demo preview: database, payments and email credentials disabled.");
console.log("Open http://127.0.0.1:4173 — press Control-C to stop.");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "4173"], { env, stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
