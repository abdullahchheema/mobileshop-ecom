import "server-only";
import type { Province } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { AddressInput } from "@/lib/validators";

// Every function is scoped by userId so one user can never touch another's addresses.

export function listAddresses(userId: string) {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(userId: string, input: AddressInput) {
  const isFirst = (await db.address.count({ where: { userId } })) === 0;
  const isDefault = isFirst || Boolean(input.isDefault);

  return db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({
      data: { ...input, province: input.province as Province, isDefault, userId },
      select: { id: true },
    });
  });
}

export async function setDefaultAddress(userId: string, addressId: string) {
  await db.$transaction([
    db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.address.updateMany({ where: { id: addressId, userId }, data: { isDefault: true } }),
  ]);
}

export async function deleteAddress(userId: string, addressId: string) {
  const removed = await db.address.deleteMany({ where: { id: addressId, userId, isDefault: false } });
  if (removed.count > 0) return;
  // Deleting the default: promote the newest remaining address.
  await db.address.deleteMany({ where: { id: addressId, userId } });
  const next = await db.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
}
