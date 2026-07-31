import type { UserRole } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[];
};

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/customers", label: "Pelanggan", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/invoices", label: "Invoice", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/subscriptions", label: "Langganan", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/payments", label: "Pembayaran", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/products", label: "Produk & Layanan", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/users", label: "Pengguna", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/templates", label: "Template Invoice", roles: ["DEVELOPER"] },
  { href: "/activity-log", label: "Activity Log", roles: ["DEVELOPER", "ADMIN"] },
  { href: "/settings/business", label: "Pengaturan", roles: ["DEVELOPER"] },
];

export const portalNav: NavItem[] = [
  { href: "/portal", label: "Dashboard", roles: ["USER"] },
  { href: "/portal/invoices", label: "Invoice Saya", roles: ["USER"] },
  { href: "/portal/subscriptions", label: "Langganan Saya", roles: ["USER"] },
  { href: "/portal/payments", label: "Pembayaran Saya", roles: ["USER"] },
  { href: "/portal/profile", label: "Profil Saya", roles: ["USER"] },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === "USER") return portalNav;
  return dashboardNav.filter((item) => item.roles.includes(role));
}
