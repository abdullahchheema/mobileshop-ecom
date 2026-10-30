"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { makeImageFirstAction, removeImageAction } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/console/action-form";
import { Button } from "@/components/ui/button";

export function ImageManager({ productId, images }: { productId: string; images: string[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, start] = useTransition();

  function upload(files: FileList | null) {
    if (!files?.length) return;
    const body = new FormData();
    for (const file of files) body.append("files", file);
    start(async () => {
      const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok) toast.error(json?.error?.message ?? "Upload failed.");
      else toast.success(`Uploaded ${files.length} ${files.length === 1 ? "image" : "images"}`);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, i) => (
            <li key={url} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-xl border bg-secondary">
                <Image src={url} alt="" fill sizes="200px" className="object-contain" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">Main</span>
                )}
              </div>
              <div className="flex gap-1">
                {i > 0 && (
                  <ActionForm action={makeImageFirstAction}>
                    <input type="hidden" name="id" value={productId} />
                    <input type="hidden" name="url" value={url} />
                    <Button type="submit" variant="outline" size="xs">
                      Make main
                    </Button>
                  </ActionForm>
                )}
                <ActionForm action={removeImageAction} confirm="Remove this image?">
                  <input type="hidden" name="id" value={productId} />
                  <input type="hidden" name="url" value={url} />
                  <Button type="submit" variant="ghost" size="xs" className="text-destructive">
                    Remove
                  </Button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No photos yet. The store shows an illustration until you add some.</p>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <Button variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
        <UploadIcon data-icon="inline-start" /> {uploading ? "Uploading…" : "Upload photos"}
      </Button>
      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB each. The main photo is shown on product cards.</p>
    </div>
  );
}
