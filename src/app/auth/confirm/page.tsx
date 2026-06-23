"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ConfirmFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifying = useRef(false);

  useEffect(() => {
    if (verifying.current) return;
    verifying.current = true;

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash || !type) {
      router.replace("/login");
      return;
    }

    const verify = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "email" | "magiclink" | "signup",
      });

      if (error) {
        router.replace("/login?error=link_expired");
        return;
      }

      router.replace("/");
    };

    verify();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      }
    >
      <ConfirmFlow />
    </Suspense>
  );
}
