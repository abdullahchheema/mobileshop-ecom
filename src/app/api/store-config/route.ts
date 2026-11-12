import { connection } from "next/server";
import { getStoreConfig } from "@/lib/erp-config";

/** What the checkout needs in the browser: delivery pricing and the payment accounts customers can pay into (all of it meant to be shown). */
export async function GET() {
  await connection();
  return Response.json(await getStoreConfig(), { headers: { "Cache-Control": "no-store" } });
}
