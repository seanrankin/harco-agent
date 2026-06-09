"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  LockIcon,
  MailIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Diamond } from "@/components/brand/diamond";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_DOMAIN, isEmailAllowed } from "@/lib/email";

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const sendLink = async (target: string) => {
    setStatus("loading");
    setErrorMessage("");

    if (!isEmailAllowed(target)) {
      setStatus("error");
      setErrorMessage(
        `Access is limited to the Harco team. Use your @${ALLOWED_DOMAIN} email.`,
      );
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <main className="auth-stage bg-background relative flex min-h-full flex-col items-center justify-center px-5 py-8 max-sm:p-0 sm:py-12">
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
          maskImage:
            "radial-gradient(120% 90% at 50% 0%, #000, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 50% 0%, #000, transparent 75%)",
        }}
      />

      <div className="bg-card border-border w-full max-w-[960px] overflow-hidden shadow-2xl max-sm:min-h-dvh max-sm:border-none max-sm:shadow-none sm:rounded-2xl sm:border lg:max-w-[960px]">
        <div className="flex flex-col lg:grid lg:grid-cols-[0.92fr_1fr]">
          {/* Form side — left on desktop, second (below banner) on tablet, only content on phone */}
          <div className="bg-card order-2 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:order-1 lg:px-11 lg:py-12">
            {/* Brand block — visible at phone (no banner) and on desktop (always) */}
            <BrandBlock className="mb-7 max-sm:flex max-lg:hidden sm:hidden lg:flex" />
            {status === "sent" ? (
              <SentPanel email={email.trim()} onBack={handleBack} />
            ) : (
              <RequestForm
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
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}

function RequestForm({
  email,
  onEmailChange,
  onSubmit,
  loading,
  error,
}: RequestFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <span className="text-ring mb-3 font-mono text-[10.5px] tracking-widest uppercase">
        Harco sales team · Secure access
      </span>
      <h1 className="text-primary font-serif text-[27px] leading-tight font-semibold tracking-tight">
        Sign in to the Assistant
      </h1>
      <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed sm:text-[14.5px]">
        Enter your Harco email and we&rsquo;ll send a one-time sign-in link
        — no password to remember.
      </p>

      <label className="mt-6 block">
        <span className="text-primary mb-2 block text-[12.5px] font-semibold tracking-tight">
          Work email
        </span>
        <div
          className={`bg-background flex items-center rounded-[10px] border-[1.5px] transition focus-within:bg-card focus-within:ring-4 ${
            error
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
            aria-invalid={Boolean(error)}
            aria-describedby="email-hint"
            className="text-primary placeholder:text-muted-foreground/65 w-full bg-transparent px-4 py-3.5 text-[15.5px] outline-none"
          />
        </div>
        <span
          id="email-hint"
          className={`mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug ${
            error ? "text-destructive font-medium" : "text-muted-foreground"
          }`}
        >
          {error ? (
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <LockIcon className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>
            {error || (
              <>
                Access is limited to{" "}
                <b className="text-foreground font-semibold">@{ALLOWED_DOMAIN}</b>{" "}
                addresses.
              </>
            )}
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground hover:bg-navy-2 mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] px-5 py-[15px] text-[14.5px] font-semibold tracking-tight shadow-[0_6px_18px_color-mix(in_oklab,var(--primary)_18%,transparent)] transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {loading ? "Sending link…" : "Email me a sign-in link"}
      </button>

      <p className="text-muted-foreground mt-4 text-[11.5px] leading-relaxed">
        The link works once and expires in 15 minutes. By signing in you agree
        to Harco&rsquo;s acceptable-use policy.
      </p>
    </form>
  );
}

function SentPanel({ email, onBack }: { email: string; onBack: () => void }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (resending || resent) return;
    setResending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
        Open it on this device and you&rsquo;ll land straight in the Harco
        Assistant. The link expires in 15 minutes.
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resent}
          className="text-primary bg-card border-border hover:bg-muted/60 inline-flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-5 py-[14px] text-[14px] font-semibold transition-colors disabled:opacity-60"
        >
          <RefreshCwIcon className="size-3.5" />
          {resent ? "Link resent" : resending ? "Resending…" : "Resend link"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-primary inline-flex items-center justify-center gap-2 py-1.5 text-[13px] font-semibold transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Use a different email
        </button>
      </div>

      <p className="text-muted-foreground mt-5 text-[11.5px] leading-relaxed">
        Didn&rsquo;t get it within a minute? Check your spam folder, or resend
        above.
      </p>
    </div>
  );
}

const FEATURES = [
  "Pressure ratings, standards & part numbers — pulled from the catalog",
  "Submittals and spec sheets, ready to forward to an engineer",
  "Live will-call stock & availability by branch",
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
          maskImage:
            "radial-gradient(130% 100% at 100% 0%, #000, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(130% 100% at 100% 0%, #000, transparent 70%)",
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
        <span className="text-accent mb-4 block font-mono text-[10.5px] tracking-widest uppercase max-lg:mb-2">
          The sales team&rsquo;s answer desk
        </span>
        {/* Long headline — desktop only */}
        <h2 className="font-serif text-[26px] leading-[1.18] font-semibold tracking-tight text-white text-balance max-lg:hidden">
          Every spec, submittal, and stock check — one question away.
        </h2>
        {/* Long body — desktop only */}
        <p className="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-white/70 max-lg:hidden">
          The Harco Assistant is your team&rsquo;s source for grounded answers,
          drawn straight from the real product library. No guessing on the
          phone with a contractor.
        </p>
        {/* Short body — banner mode only */}
        <p className="text-[13.5px] leading-relaxed text-white/70 max-lg:block lg:hidden">
          Grounded answers for the sales floor — specs, submittals, and live
          stock from the real product library.
        </p>
      </div>

      {/* Product preview — desktop only */}
      <div className="relative z-10 mt-5 rounded-[13px] border border-white/12 bg-white/[0.05] p-[13px] pb-3 max-lg:hidden">
        <div className="bg-background grid h-[94px] place-items-center overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/product-shots/fittings.png"
            alt=""
            className="max-h-[82%] max-w-[82%] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-[3px]">
          <span className="font-mono text-[12.5px] font-semibold tracking-wider text-white">
            HSDR-1212-MJ
          </span>
          <span className="font-mono text-[10.5px] text-white/55">
            12″ Push-On × MJ · AWWA C907 · 235 PSI
          </span>
        </div>
      </div>

      {/* Bullets — desktop only */}
      <ul className="relative z-10 mt-5 flex flex-col gap-2.5 max-lg:hidden">
        {FEATURES.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 text-[13.5px] leading-snug text-white/80"
          >
            <span
              aria-hidden="true"
              className="bg-accent mt-1.5 inline-block size-[9px] shrink-0 rotate-45"
            />
            {f}
          </li>
        ))}
      </ul>

      {/* Status — desktop only */}
      <div className="relative z-10 mt-auto flex items-center gap-2.5 pt-5 font-mono text-[10.5px] tracking-wide text-white/50 max-lg:hidden">
        <span className="bg-xlsx ring-xlsx/25 size-[6px] rounded-full ring-[3px]" />
        {/* TODO(redesign): pull live count from indexed-documents query */}
        Grounded in 112 indexed Harco documents · synced today
      </div>
    </aside>
  );
}
