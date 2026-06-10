import { createClient } from "@/lib/supabase/server";

/**
 * Checks auth unless SKIP_AUTH is set. Returns a 401 Response if
 * unauthorized, or null if the request is allowed to proceed.
 */
export async function requireAuth(): Promise<Response | null> {
  if (process.env.SKIP_AUTH === "true") {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
