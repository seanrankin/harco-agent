export function appendSignature(
  body: string,
  displayName: string | null | undefined,
  email: string
): string {
  const hasName = displayName != null && displayName.trim().length > 0;
  const identityLines = hasName ? `${displayName}\n${email}` : email;
  return `${body}\n\nBest,\n${identityLines}\nHarco Fittings`;
}

export function getInitials(displayName?: string | null, email?: string | null): string {
  if (displayName && displayName.trim().length > 0) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}
