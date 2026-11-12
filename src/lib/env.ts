// Checks the environment once, when the server starts. Names only: values are never printed.
// A production server that is missing a variable refuses to start (so a bad deploy is noticed at once); in
// development it only warns, so the catalogue can be worked on without the order key.

type Check = { name: string; why: string; any?: string[]; secret?: boolean };

const REQUIRED: Check[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", why: "the ERP's catalogue (Supabase project URL)", any: ["SUPABASE_URL"] },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", why: "the ERP's catalogue (publishable key)", any: ["SUPABASE_ANON_KEY"] },
  { name: "ERP_API_URL", why: "placing and tracking orders" },
  { name: "ERP_API_KEY", why: "placing and tracking orders (server only)", secret: true },
];

/** The names of the variables that are missing or empty. */
export function missingEnv(env: Record<string, string | undefined> = process.env) {
  return REQUIRED.filter((c) => ![c.name, ...(c.any ?? [])].some((n) => env[n]?.trim())).map((c) => c);
}

export function validateEnv(env: Record<string, string | undefined> = process.env, production = process.env.NODE_ENV === "production") {
  const missing = missingEnv(env);
  const problems: string[] = [];
  for (const [name, value] of Object.entries(env)) {
    // The ERP key must never be exposed to the browser.
    if (name.startsWith("NEXT_PUBLIC_") && /ERP_API_KEY|SERVICE_ROLE|SECRET/i.test(name) && value) problems.push(`${name} would be sent to browsers: never prefix a secret with NEXT_PUBLIC_`);
  }
  if (env.ERP_API_URL && !/^https?:\/\//.test(env.ERP_API_URL)) problems.push("ERP_API_URL must start with https:// (or http:// locally)");
  const lines = [...missing.map((m) => `${m.name}: needed for ${m.why}`), ...problems];
  if (lines.length === 0) return;
  const message = `Storefront configuration problem (see .env.example):\n - ${lines.join("\n - ")}`;
  if (production) throw new Error(message);
  console.warn(`[env] ${message}`);
}
