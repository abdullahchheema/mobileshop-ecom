import { z } from "zod";
import { setSpecs } from "@/lib/admin-products";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, expireProduct, notFound } from "@/lib/erp-api";

const body = z.object({
  rows: z.array(z.object({ key: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(120) })).max(30),
});

/** Replaces the product's specification rows (e.g. Chip: A15 Bionic). */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/products/[id]/specs">) {
  const input = await readSignedCrmJson(request, body);
  if (input instanceof Response) return input;
  try {
    const { slug } = await setSpecs((await params).id, Object.fromEntries(input.data.rows.map((r) => [r.key, r.value])));
    expireProduct(slug);
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2025") return notFound("That product");
    return erpError(e);
  }
  return Response.json({ ok: true });
}
