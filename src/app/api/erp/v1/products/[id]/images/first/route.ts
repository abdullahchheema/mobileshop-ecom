import { z } from "zod";
import { makeImageFirst } from "@/lib/admin-products";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, expireProduct, notFound } from "@/lib/erp-api";

/** Makes one photo the main one (the first photo is shown on cards). */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/products/[id]/images/first">) {
  const input = await readSignedCrmJson(request, z.object({ url: z.string().min(1) }));
  if (input instanceof Response) return input;
  try {
    const { slug } = await makeImageFirst((await params).id, input.data.url);
    expireProduct(slug);
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2025") return notFound("That product");
    return erpError(e);
  }
  return Response.json({ ok: true });
}
