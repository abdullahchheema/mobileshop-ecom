import type { NextRequest } from "next/server";
import { getSearchSuggestions } from "@/lib/catalog";

/** Search-as-you-type results for the header search box and the mobile app. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return Response.json({ data: [] });
  return Response.json({ data: await getSearchSuggestions(q) });
}
