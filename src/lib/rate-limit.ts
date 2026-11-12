// A small in-memory limiter to slow down order spam. It is per server instance (good enough for one VPS process;
// behind several instances use the reverse proxy's rate limiting too).
const hits = new Map<string, number[]>();

export function tooMany(id: string, limit: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(id, recent);
    return true;
  }
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return false;
}

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
