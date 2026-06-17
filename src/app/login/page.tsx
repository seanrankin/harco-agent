"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ArrowLeftIcon,
  LockIcon,
  MailIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react";

import { Diamond } from "@/components/brand/diamond";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_DOMAIN, isEmailAllowed } from "@/lib/email";
import { SIGNED_IN_FLAG } from "@/lib/onboarding";

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // First-time visitors on this device supply their name; returning users skip it.
  // Read via useSyncExternalStore so it is SSR-safe (server assumes returning => no field)
  // and hydrates to the real localStorage value without a mismatch.
  const showName = useSyncExternalStore(
    () => () => {},
    () => !localStorage.getItem(SIGNED_IN_FLAG),
    () => false
  );

  const sendLink = async (target: string) => {
    setStatus("loading");
    setErrorMessage("");

    const trimmedName = name.trim();
    if (showName && !trimmedName) {
      setStatus("error");
      setErrorMessage("Enter your name so we know who to greet.");
      return;
    }

    if (!target) {
      setStatus("error");
      setErrorMessage("Enter your email so we can send your sign-in link.");
      return;
    }

    if (!isEmailAllowed(target)) {
      setStatus("error");
      setErrorMessage(`Access is limited to the Harco team. Use your @${ALLOWED_DOMAIN} email.`);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: trimmedName ? { display_name: trimmedName } : undefined,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendLink(email.trim());
  };

  const handleBack = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <main className="auth-stage bg-background relative min-h-full overflow-y-auto">
      {/* Subtle grid + radial-glow backdrop (desktop/tablet only) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 max-sm:hidden"
        style={{
          background:
            "radial-gradient(120% 120% at 80% -10%, color-mix(in oklab, var(--spec-blue) 6%, transparent), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 max-sm:hidden"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--primary) 3.5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--primary) 3.5%, transparent) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, #000, transparent 75%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, #000, transparent 75%)",
        }}
      />

      <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-8 max-sm:p-0 sm:py-12">
        <div className="bg-card border-border w-full max-w-[960px] overflow-hidden shadow-2xl max-sm:min-h-dvh max-sm:border-none max-sm:shadow-none sm:rounded-2xl sm:border lg:max-w-[960px]">
          <div className="flex flex-col lg:grid lg:grid-cols-[0.92fr_1fr]">
            {/* Form side — left on desktop, second (below banner) on tablet, only content on phone */}
            <div className="bg-card order-2 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:order-1 lg:px-11 lg:py-12">
              {/* Brand block — visible at phone (no banner) and on desktop (always) */}
              <BrandBlock className="mb-7 max-sm:flex max-lg:hidden sm:hidden lg:flex" />
              {status === "sent" ? (
                <SentPanel name={name.trim()} email={email.trim()} onBack={handleBack} />
              ) : (
                <RequestForm
                  name={name}
                  showName={showName}
                  onNameChange={(v) => {
                    setName(v);
                    if (errorMessage) setErrorMessage("");
                  }}
                  email={email}
                  onEmailChange={(v) => {
                    setEmail(v);
                    if (errorMessage) setErrorMessage("");
                  }}
                  onSubmit={handleSubmit}
                  loading={status === "loading"}
                  error={status === "error" ? errorMessage : ""}
                />
              )}
            </div>

            {/* Feature side — right on desktop, top-banner on tablet, hidden on phone */}
            <FeaturePanel />
          </div>
        </div>

        <p className="text-muted-foreground mt-7 text-center font-mono text-[10.5px] tracking-wider max-sm:hidden">
          © Harco Fittings · Lynchburg, VA · For authorized Harco personnel only
        </p>
      </div>
    </main>
  );
}

function BrandBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Diamond size={34} color="var(--primary)" />
      <div className="flex flex-col leading-tight">
        <span className="text-primary font-serif text-[17px] font-semibold tracking-tight">
          Harco Fittings
        </span>
        <span className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase">
          Knowledge Base
        </span>
      </div>
    </div>
  );
}

interface RequestFormProps {
  name: string;
  showName: boolean;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}

function RequestForm({
  name,
  showName,
  onNameChange,
  email,
  onEmailChange,
  onSubmit,
  loading,
  error,
}: RequestFormProps) {
  // A blank-name error belongs to the name field; otherwise the error is the email's.
  const nameError = showName && Boolean(error) && !name.trim();
  const emailError = Boolean(error) && !nameError;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <span className="text-ring mb-3 font-mono text-[10.5px] tracking-widest uppercase">
        Harco sales team · Secure access
      </span>
      <h1 className="text-primary font-serif text-[27px] leading-tight font-semibold tracking-tight">
        Sign in to the Assistant
      </h1>
      <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed sm:text-[14.5px]">
        Enter your Harco email and we&rsquo;ll send a one-time sign-in link — no password to
        remember.
      </p>

      {showName && (
        <label className="mt-6 block">
          <span className="text-primary mb-2 block text-[12.5px] font-semibold tracking-tight">
            Your name <span className="text-destructive">*</span>
          </span>
          <div
            className={`bg-background flex items-center rounded-[10px] border-[1.5px] transition focus-within:bg-card focus-within:ring-4 ${
              nameError
                ? "border-destructive focus-within:ring-destructive/12"
                : "border-border focus-within:border-ring focus-within:ring-ring/12"
            }`}
          >
            <UserIcon className="text-muted-foreground/65 ml-4 size-4 shrink-0" strokeWidth={1.8} />
            <input
              type="text"
              autoComplete="name"
              required
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              aria-invalid={nameError}
              className="text-primary placeholder:text-muted-foreground/65 w-full bg-transparent px-3 py-3.5 text-[15.5px] outline-none"
            />
          </div>
          {nameError && (
            <span className="text-destructive mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug font-medium">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </span>
          )}
        </label>
      )}

      <label className="mt-6 block">
        <span className="text-primary mb-2 block text-[12.5px] font-semibold tracking-tight">
          Work email <span className="text-destructive">*</span>
        </span>
        <div
          className={`bg-background flex items-center rounded-[10px] border-[1.5px] transition focus-within:bg-card focus-within:ring-4 ${
            emailError
              ? "border-destructive focus-within:ring-destructive/12"
              : "border-border focus-within:border-ring focus-within:ring-ring/12"
          }`}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            required
            placeholder={`you@${ALLOWED_DOMAIN}`}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            aria-invalid={emailError}
            aria-describedby="email-hint"
            className="text-primary placeholder:text-muted-foreground/65 w-full bg-transparent px-4 py-3.5 text-[15.5px] outline-none"
          />
        </div>
        <span
          id="email-hint"
          className={`mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug ${
            emailError ? "text-destructive font-medium" : "text-muted-foreground"
          }`}
        >
          {emailError ? (
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <LockIcon className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>
            {(emailError && error) || (
              <>
                Access is limited to{" "}
                <b className="text-foreground font-semibold">@{ALLOWED_DOMAIN}</b> addresses.
              </>
            )}
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground hover:bg-navy-2 mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] px-5 py-[15px] text-[14.5px] font-semibold tracking-tight shadow-[0_6px_18px_color-mix(in_oklab,var(--primary)_18%,transparent)] transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {loading ? "Sending link…" : "Email me a sign-in link"}
      </button>

      <p className="text-muted-foreground mt-4 text-[11.5px] leading-relaxed">
        The link works once and expires in 15 minutes. By signing in you agree to Harco&rsquo;s
        acceptable-use policy.
      </p>
    </form>
  );
}

function SentPanel({ name, email, onBack }: { name: string; email: string; onBack: () => void }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (resending || resent) return;
    setResending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: name ? { display_name: name } : undefined,
      },
    });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 2400);
  };

  return (
    <div className="flex flex-col">
      <div className="bg-ring/10 text-ring mb-5 grid size-14 place-items-center rounded-2xl">
        <MailIcon className="size-7" strokeWidth={1.8} />
      </div>
      <span className="text-ring mb-3 font-mono text-[10.5px] tracking-widest uppercase">
        Link sent
      </span>
      <h1 className="text-primary font-serif text-[27px] leading-tight font-semibold tracking-tight">
        Check your email
      </h1>
      <p className="text-muted-foreground mt-2.5 text-[14.5px] leading-relaxed">
        We sent a secure sign-in link to:
      </p>

      <div className="bg-background border-border text-primary mt-3.5 rounded-[9px] border px-4 py-3.5 font-mono text-sm font-semibold break-all">
        {email}
      </div>

      <p className="text-muted-foreground mt-4 text-[13.5px] leading-relaxed">
        Open it on this device and you&rsquo;ll land straight in the Harco Assistant. The link
        expires in 15 minutes.
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resent}
          className="text-primary bg-card border-border hover:bg-muted/60 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-5 py-[14px] text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCwIcon className="size-3.5" />
          {resent ? "Link resent" : resending ? "Resending…" : "Resend link"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-primary inline-flex cursor-pointer items-center justify-center gap-2 py-1.5 text-[13px] font-semibold transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Use a different email
        </button>
      </div>

      <p className="text-muted-foreground mt-5 text-[11.5px] leading-relaxed">
        Didn&rsquo;t get it within a minute? Check your spam folder, or resend above.
      </p>
    </div>
  );
}

const AGENT_PROPS: [string, string][] = [
  ["Instant", "Every answer in seconds — no callbacks, no hold music."],
  ["Grounded", "Pulled straight from what Harco actually knows."],
  ["Always on", "2 a.m. quote or a Sunday rush — it never clocks out."],
];

function FeaturePanel() {
  return (
    <aside
      aria-hidden="true"
      className="relative order-1 flex flex-col overflow-hidden text-white max-sm:hidden max-lg:p-7 max-lg:py-6 lg:order-2 lg:p-10"
      style={{
        background:
          "linear-gradient(165deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 80%, black) 100%)",
      }}
    >
      {/* Subtle grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(130% 100% at 100% 0%, #000, transparent 70%)",
          WebkitMaskImage: "radial-gradient(130% 100% at 100% 0%, #000, transparent 70%)",
        }}
      />

      {/* Brand block — only visible on tablet banner mode */}
      <div className="relative z-10 flex items-center gap-3 max-lg:flex lg:hidden">
        <Diamond size={36} color="var(--background)" ink="var(--primary)" />
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-[17px] font-semibold tracking-tight text-white">
            Harco Fittings
          </span>
          <span className="font-mono text-[9.5px] tracking-widest text-white/55 uppercase">
            Knowledge Base
          </span>
        </div>
      </div>

      <div className="relative z-10 max-lg:mt-3.5 lg:mt-1.5">
        <span className="text-accent mb-[22px] inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] uppercase max-lg:mb-2">
          <span aria-hidden="true" className="bg-accent h-px w-6 opacity-85" />
          Meet the Harco Agent
        </span>
        {/* Headline — desktop only */}
        <h2 className="font-serif text-[43px] leading-[1.05] font-semibold tracking-[-0.028em] text-white text-balance max-lg:hidden">
          Stop guessing.
          <br />
          <span className="text-accent">Start closing.</span>
        </h2>
        {/* Long body — desktop only */}
        <p className="mt-5 max-w-[33ch] text-[15px] leading-relaxed text-white/[0.74] max-lg:hidden">
          A straight answer the moment a customer asks — so your team never says &ldquo;let me get
          back to you&rdquo; again.
        </p>
        {/* Short body — banner mode only */}
        <p className="text-[13.5px] leading-relaxed text-white/[0.72] max-lg:block lg:hidden">
          A straight answer the moment a customer asks — no callbacks, no guessing.
        </p>
      </div>

      {/* Value props — desktop only */}
      <ul className="relative z-10 mt-auto flex flex-col max-lg:hidden">
        {AGENT_PROPS.map(([key, val]) => (
          <li
            key={key}
            className="flex items-baseline gap-4 border-t border-white/12 py-[17px]"
          >
            <span className="w-24 shrink-0 font-serif text-[19px] font-semibold tracking-tight text-white">
              {key}
            </span>
            <span className="text-[13.5px] leading-[1.45] text-white/[0.66]">{val}</span>
          </li>
        ))}
      </ul>

      {/* Footer — desktop only */}
      <div className="relative z-10 mt-[26px] flex items-center gap-2.5 border-t border-white/12 pt-[18px] font-mono text-[10.5px] tracking-wide text-white/55 uppercase max-lg:hidden">
        <span className="bg-accent ring-accent/20 size-1.5 rounded-full ring-[3px]" />
        Built for the people who pick up the phone
      </div>
    </aside>
  );
}
