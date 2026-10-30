"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { applyAsSeller, SellerError } from "@/lib/sellers";
import { getSession } from "@/lib/session";
import { sellerApplicationSchema } from "@/lib/validators";

export type ApplicationState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors: Record<string, string[] | undefined> };

export async function applyAsSellerAction(_prev: ApplicationState, formData: FormData): Promise<ApplicationState> {
  const session = await getSession();
  if (!session) return { status: "error", message: "Please sign in again.", fieldErrors: {} };

  const parsed = sellerApplicationSchema.safeParse({
    ...Object.fromEntries(formData),
    agree: formData.get("agree") === "on",
  });
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await applyAsSeller(session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof SellerError) return { status: "error", message: e.message, fieldErrors: {} };
    throw e;
  }
  redirect("/sell/status");
}
