import { revalidateTag } from "next/cache";
import { addImages } from "@/lib/admin-products";
import { apiError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { deleteProductImage, saveProductImage, UploadError } from "@/lib/storage";

const MAX_FILES = 10;

/** Uploads product images (multipart field "files"). Admins only. */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/products/[id]/images">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user.role !== "ADMIN") return apiError(403, "FORBIDDEN", "Admins only.");

  const files = (await request.formData()).getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return apiError(400, "INVALID", "Choose at least one image.");
  if (files.length > MAX_FILES) return apiError(400, "INVALID", `Upload at most ${MAX_FILES} images at a time.`);

  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await saveProductImage(file));
  } catch (e) {
    // All or nothing: don't leave earlier files of this batch behind.
    await Promise.all(urls.map(deleteProductImage));
    if (e instanceof UploadError) return apiError(400, "INVALID_IMAGE", e.message);
    throw e;
  }

  const { slug, images } = await addImages((await params).id, urls);
  revalidateTag(`product:${slug}`, "max");
  revalidateTag("offers", "max");
  return Response.json({ data: { images } }, { status: 201 });
}
