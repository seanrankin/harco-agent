/**
 * Deterministic email intent detector.
 * Identifies when a user explicitly wants to CREATE/SEND an email,
 * excluding cases where "email" refers to an existing email in context.
 */

// False positive patterns: "email" used as a noun referring to existing emails
const FALSE_POSITIVE_PATTERNS = [
  /\bthe email says\b/i,
  /\bfrom the email\b/i,
  /\bwhat'?s in the email\b/i,
  /\bin the email\b/i,
  /\bemail source\b/i,
  /\bemail attachment\b/i,
  /\bemail me the\b/i,
  /\bcheck the email\b/i,
  /\bsummarize the email\b/i,
  /\bread the email\b/i,
  /\bthe email mentions\b/i,
  /\bthe email contains\b/i,
  /\baccording to the email\b/i,
];

// Positive patterns: explicit intent to create/send a new email
const POSITIVE_PATTERNS = [
  /\b(draft|write|compose)\s+(an?|the|me an?|me the|the cover)\s+email\b/i,
  /\bput together\s+(an?|the)\s+email\b/i,
  /\bemail them\b/i,
  /\bsend them\s+(an?|the)\s+email\b/i,
  /\bsend\s+(an?|the)\s+email\b/i,
  /\bi need to email\b/i,
  /\bwriting an email\b/i,
];

export function detectEmailIntent(message: string): {
  hasEmailIntent: boolean;
} {
  // Check false positives first: if the message is about an existing email, bail
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return { hasEmailIntent: false };
    }
  }

  // Check for positive email creation intent
  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return { hasEmailIntent: true };
    }
  }

  return { hasEmailIntent: false };
}
