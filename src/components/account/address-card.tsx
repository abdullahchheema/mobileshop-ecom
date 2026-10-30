import type { Address } from "@/generated/prisma/client";
import { type Dict, getDict } from "@/i18n";

/** Read-only address block, shared by the address book, checkout and order pages. */
export function AddressLines({
  address,
  t = getDict("en"),
}: {
  address: Pick<Address, "fullName" | "phone" | "line1" | "line2" | "city" | "province" | "postalCode">;
  t?: Dict;
}) {
  return (
    <div className="text-sm">
      <p className="font-semibold">{address.fullName}</p>
      <p className="text-muted-foreground">{address.line1}</p>
      {address.line2 && <p className="text-muted-foreground">{address.line2}</p>}
      <p className="text-muted-foreground">
        {address.city}, {t.address.provinces[address.province] ?? address.province}
        {address.postalCode && ` ${address.postalCode}`}
      </p>
      <p className="text-muted-foreground">
        <bdi>{address.phone}</bdi>
      </p>
    </div>
  );
}
