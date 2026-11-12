import { normalizeItems, snapshotSchema } from "@/lib/crm-stock";
import { getReconciliationForSource, readSignedCrmJson, requireCrmSource } from "@/lib/crm-sync";

/**
 * Returns the current ERP ↔ Trendz reconciliation report and mismatch alerts
 * based on the last received stock snapshot, pending orders, and live Trendz offers.
 */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;

  const report = await getReconciliationForSource(source.id);
  if (!report) return Response.json({ error: { code: "NOT_FOUND", message: "Integration source not found." } }, { status: 404 });
  return Response.json(report);
}

/**
 * Read-only comparison: accepts a live ERP stock snapshot (`{ items }`) and reports
 * any drift against Trendz's stored groups and live offers without modifying Trendz data.
 */
export async function POST(request: Request) {
  const input = await readSignedCrmJson(request, snapshotSchema);
  if (input instanceof Response) return input;

  const { accepted, rejected } = normalizeItems(input.data.items);
  const report = await getReconciliationForSource(input.source.id, accepted);
  if (!report) return Response.json({ error: { code: "NOT_FOUND", message: "Integration source not found." } }, { status: 404 });
  return Response.json({ ...report, liveRejected: rejected });
}

