import { revalidateTag } from "next/cache";
import { listSources, refreshFromErp } from "@/lib/erp-stock";

/**
 * Safety net: re-reads the ERP's stock view for every integration, in case a refresh call from
 * the ERP was missed (the website was down, a network blip). Run every 5 minutes. Requires CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  const results = [];
  for (const source of await listSources()) results.push(await refreshFromErp(source));
  if (results.some((r) => r.offersUpdated > 0 || r.soldOut > 0)) revalidateTag("offers", "max");
  return Response.json({ refreshed: results.length });
}
