import type { ReturnStatus } from "@/generated/prisma/client";
import { requireCrmSource } from "@/lib/crm-sync";
import { countReturnsByStatus, listReturns } from "@/lib/return-requests";

const STATUSES: ReturnStatus[] = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"];

/** The shop's return requests for one status (`?status=REQUESTED`, oldest first) plus a count per status. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;

  const wanted = new URL(request.url).searchParams.get("status");
  const status = STATUSES.find((s) => s === wanted) ?? "REQUESTED";
  const [returns, counts] = await Promise.all([listReturns(status, source.sellerId), countReturnsByStatus(source.sellerId)]);
  return Response.json({ status, statuses: STATUSES, counts, returns });
}
