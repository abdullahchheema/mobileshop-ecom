/**
 * Splits `DATABASE_URL` into what `PrismaPg` needs. Prisma's CLI reads `?schema=trendz` from the URL
 * (migrations go to that schema), but the runtime adapter ignores it unless it is passed as an option,
 * so queries would otherwise be written for the default `public` schema.
 */
export function pgAdapterConfig(url = process.env.DATABASE_URL) {
  if (!url) return { config: { connectionString: url }, options: undefined };
  let schema: string | undefined;
  let connectionString = url;
  try {
    const parsed = new URL(url);
    schema = parsed.searchParams.get("schema") ?? undefined;
    parsed.searchParams.delete("schema");
    connectionString = parsed.toString();
  } catch {
    // Not a URL we can parse (for example a socket path): use it as given.
  }
  return { config: { connectionString }, options: schema ? { schema } : undefined };
}
