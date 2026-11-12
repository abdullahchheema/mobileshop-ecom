import { connection } from "next/server";
import { getCatalogueVersion } from "@/lib/catalog";

/** A fingerprint of the catalogue, polled by open pages so they refresh themselves when stock or prices change. */
export async function GET() {
  await connection();
  return Response.json({ version: await getCatalogueVersion() }, { headers: { "Cache-Control": "no-store" } });
}
