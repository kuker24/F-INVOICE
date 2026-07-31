import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/config/env";

/** Service-role client — server only. Never import from client components. */
export function createAdminClient() {
  const env = getServerEnv();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
