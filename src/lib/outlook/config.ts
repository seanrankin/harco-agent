const REQUIRED_ENV_VARS = [
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_REDIRECT_URI",
] as const;

let warned = false;

export function isOutlookEnabled(): boolean {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key] || process.env[key] === "");

  if (missing.length > 0) {
    if (!warned) {
      console.warn(`[Outlook] Disabled: missing environment variable(s): ${missing.join(", ")}`);
      warned = true;
    }
    return false;
  }

  return true;
}
