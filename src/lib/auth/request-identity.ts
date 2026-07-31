import "server-only";
import { headers } from "next/headers";
import type { AccountStatus, Profile, UserRole } from "@/types/database";

/** Internal request headers set by middleware after auth (not exposed to browser). */
export const HDR_UID = "x-finv-uid";
export const HDR_ROLE = "x-finv-role";
export const HDR_STATUS = "x-finv-status";
export const HDR_NAME = "x-finv-name";
export const HDR_EMAIL = "x-finv-email";
export const HDR_OWNER = "x-finv-owner";
export const HDR_CUSTOMER = "x-finv-customer";
export const HDR_PHONE = "x-finv-phone";

export type MiddlewareIdentity = {
  userId: string;
  role: UserRole;
  status: AccountStatus;
  full_name: string;
  email: string;
  owner_id: string | null;
  customer_id: string | null;
  phone: string | null;
};

/** Build Profile-shaped object from middleware headers (layout/page read path). */
export function identityToProfile(id: MiddlewareIdentity): Profile {
  return {
    id: id.userId,
    full_name: id.full_name,
    email: id.email,
    phone: id.phone,
    avatar_url: null,
    role: id.role,
    status: id.status,
    customer_id: id.customer_id,
    owner_id: id.owner_id,
    last_login_at: null,
    created_by: null,
    created_at: "",
    updated_at: "",
  };
}

export async function readMiddlewareIdentity(): Promise<MiddlewareIdentity | null> {
  const h = await headers();
  const userId = h.get(HDR_UID);
  const role = h.get(HDR_ROLE) as UserRole | null;
  const status = h.get(HDR_STATUS) as AccountStatus | null;
  if (!userId || !role || !status) return null;
  const owner = h.get(HDR_OWNER);
  const customer = h.get(HDR_CUSTOMER);
  const phone = h.get(HDR_PHONE);
  return {
    userId,
    role,
    status,
    full_name: h.get(HDR_NAME) ?? "",
    email: h.get(HDR_EMAIL) ?? "",
    owner_id: owner && owner.length ? owner : null,
    customer_id: customer && customer.length ? customer : null,
    phone: phone && phone.length ? phone : null,
  };
}
