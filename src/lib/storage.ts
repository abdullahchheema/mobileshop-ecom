import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Product image storage. Local development writes to public/uploads; swap the
// two functions below for Cloudinary/R2 before deploying (serverless disks are
// read-only and not shared between instances).

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PREFIX = "/uploads/products/";

export class UploadError extends Error {}

/** Detects the real image type from the file's first bytes; never trusts the name or MIME type. */
export function sniffImageType(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export async function saveProductImage(file: File) {
  if (file.size === 0) throw new UploadError(`${file.name} is empty.`);
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError(`${file.name} is larger than 5 MB.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImageType(bytes);
  if (!ext) throw new UploadError(`${file.name} isn't a JPEG, PNG or WebP image.`);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return `${PUBLIC_PREFIX}${name}`;
}

/** Removes a previously uploaded image. Ignores URLs we didn't create. */
export async function deleteProductImage(url: string) {
  if (!url.startsWith(PUBLIC_PREFIX)) return;
  const name = path.basename(url);
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}
