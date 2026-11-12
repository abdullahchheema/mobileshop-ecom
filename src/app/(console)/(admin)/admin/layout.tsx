import { ConsoleShell } from "@/components/console/console-shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ConsoleShell
      label="Admin"
      nav={[
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/admin/payouts", label: "Payouts", icon: "payouts" },
        { href: "/admin/sellers", label: "Sellers", icon: "sellers" },
        { href: "/admin/products", label: "Products", icon: "products" },
        { href: "/admin/categories", label: "Categories & brands", icon: "categories" },
        { href: "/admin/banners", label: "Home banners", icon: "banners" },
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
