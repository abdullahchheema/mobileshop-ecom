import { z } from "zod";
import { addImages } from "@/lib/admin-products";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, expireProduct, notFound } from "@/lib/erp-api";
import { deleteProductImage, saveProductImage } from "@/lib/storage";

const body = z.object({
  /** Photos as base64 (up to 10, 5 MB each), so the request can be signed like every other ERP call. */
  files: z.array(z.object({ name: z.string().trim().min(1).max(120), data: z.string().min(1) })).min(1, "Choose at least one image.").max(10),
});

export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/products/[id]/images">) {
  const input = await readSignedCrmJson(request, body);
  if (input instanceof Response) return input;
  const { id } = await params;

  const urls: string[] = [];
  try {
    for (const f of input.data.files) urls.push(await saveProductImage(new File([Buffer.from(f.data, "base64")], f.name)));
    const { slug, images } = await addImages(id, urls);
    expireProduct(slug);
    return Response.json({ images }, { status: 201 });
  } catch (e) {
    // All or nothing: do not leave files of this batch behind.
    await Promise.all(urls.map(deleteProductImage));
    if (typeof e === "object" && e && "code" in e && e.code === "P2025") return notFound("That product");
    return erpError(e);
  }
}
