// Fails when a secret could reach the browser: looks for the name or the value of ERP_API_KEY (and any
// service-role style key) inside the client bundle (.next/static). Run after `npm run build`.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
const dir = ".next/static";
if (!existsSync(dir)) {
  console.error("No .next/static: run `npm run build` first.");
  process.exit(2);
}
const needles = [["ERP_API_KEY (name)", "ERP_API_KEY"], ["X-API-Key header", "X-API-Key"], ["service_role", "service_role"], ["sb_secret_", "sb_secret_"]];
const key = process.env.ERP_API_KEY;
if (key && key.length >= 8) needles.push(["the value of ERP_API_KEY", key]);

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json|map)$/.test(f)) files.push(p);
  }
};
walk(dir);
const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [label, needle] of needles) if (text.includes(needle)) hits.push(`${label} found in ${file}`);
}
if (hits.length) {
  console.error("SECRET IN CLIENT BUNDLE:\n - " + hits.join("\n - "));
  process.exit(1);
}
console.log(`Bundle check passed: ${files.length} client files, no ERP key or secret.`);
