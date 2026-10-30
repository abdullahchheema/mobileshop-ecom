import { ConsoleShell } from "@/components/console/console-shell";

export default function SellerLayout({ children }: LayoutProps<"/seller">) {
  return (
    <ConsoleShell
      label="Seller hub"
      nav={[
        { href: "/seller", label: "Overview", icon: "dashboard", exact: true },
        { href: "/seller/orders", label: "Orders", icon: "orders" },
        { href: "/seller/listings", label: "Listings", icon: "listings" },
        { href: "/seller/payouts", label: "Earnings & payouts", icon: "payouts" },
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
