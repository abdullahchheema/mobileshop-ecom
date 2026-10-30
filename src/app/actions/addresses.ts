"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createAddress, deleteAddress, setDefaultAddress } from "@/lib/addresses";
import { getSession } from "@/lib/session";
import { addressSchema } from "@/lib/validators";

export type AddressFormState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors: Record<string, string[] | undefined> }
  | { status: "saved"; addressId: string };

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

export async function createAddressAction(_prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const session = await getSession();
  if (!session) return { status: "error", message: "Please sign in again.", fieldErrors: {} };

  const parsed = addressSchema.safeParse({
    ...Object.fromEntries(formData),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const address = await createAddress(session.user.id, parsed.data);
  refresh();
  return { status: "saved", addressId: address.id };
}

export async function setDefaultAddressAction(addressId: string) {
  await setDefaultAddress(await requireUserId(), z.string().parse(addressId));
  refresh();
}

export async function deleteAddressAction(addressId: string) {
  await deleteAddress(await requireUserId(), z.string().parse(addressId));
  refresh();
}
