import type { UserRole } from "@/types/database";

export type NavGroup = "home" | "master" | "uang" | "sistem";

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[];
  group: NavGroup;
};

export const navGroupLabels: Record<NavGroup, string | null> = {
  home: null,
  master: "Master",
  uang: "Uang",
  sistem: "Sistem",
};

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["DEVELOPER", "ADMIN"], group: "home" },
  { href: "/customers", label: "Pelanggan", roles: ["DEVELOPER", "ADMIN"], group: "master" },
  { href: "/products", label: "Produk & Layanan", roles: ["DEVELOPER", "ADMIN"], group: "master" },
  { href: "/invoices", label: "Invoice", roles: ["DEVELOPER", "ADMIN"], group: "uang" },
  { href: "/subscriptions", label: "Langganan", roles: ["DEVELOPER", "ADMIN"], group: "uang" },
  { href: "/payments", label: "Pembayaran", roles: ["DEVELOPER", "ADMIN"], group: "uang" },
  { href: "/users", label: "Pengguna", roles: ["DEVELOPER", "ADMIN"], group: "sistem" },
  { href: "/templates", label: "Template Invoice", roles: ["DEVELOPER"], group: "sistem" },
  { href: "/activity-log", label: "Log Aktivitas", roles: ["DEVELOPER", "ADMIN"], group: "sistem" },
  { href: "/settings/business", label: "Pengaturan", roles: ["DEVELOPER"], group: "sistem" },
];

export const portalNav: NavItem[] = [
  { href: "/portal", label: "Dashboard", roles: ["USER"], group: "home" },
  { href: "/portal/invoices", label: "Invoice Saya", roles: ["USER"], group: "uang" },
  { href: "/portal/subscriptions", label: "Langganan Saya", roles: ["USER"], group: "uang" },
  { href: "/portal/payments", label: "Pembayaran Saya", roles: ["USER"], group: "uang" },
  { href: "/portal/profile", label: "Profil Saya", roles: ["USER"], group: "sistem" },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === "USER") return portalNav;
  return dashboardNav.filter((item) => item.roles.includes(role));
}
