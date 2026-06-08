export const ALLOWED_DOMAIN = "harcofittings.com";

export function isEmailAllowed(email: string): boolean {
  const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const lower = email.toLowerCase();
  const domain = lower.split("@")[1];

  return domain === ALLOWED_DOMAIN || allowedEmails.includes(lower);
}
