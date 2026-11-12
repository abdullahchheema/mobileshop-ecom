import { z } from "zod";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, notFound, ownsReturn } from "@/lib/erp-api";
import { applyReturnAction } from "@/lib/return-requests";

const body = z.object({
  action: z.enum(["approve", "reject", "receive", "refund"]),
  note: z.string().trim().max(300).optional(),
  /** Cash-on-delivery refunds need the transfer reference; card refunds get the gateway's. */
  refundRef: z.string().trim().max(60).optional(),
});

/** Moves a return forward (approve → receive → refund, or reject). A card refund goes through the gateway first. */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/returns/[id]">) {
  const input = await readSignedCrmJson(request, body);
  if (input instanceof Response) return input;
  const { id } = await params;
  if (!(await ownsReturn(input.source, id))) return notFound("That return");

  try {
    await applyReturnAction(id, input.data.action, input.data);
  } catch (e) {
    return erpError(e);
  }
  return Response.json({ ok: true });
}
