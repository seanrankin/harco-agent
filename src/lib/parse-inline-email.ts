/**
 * Detects and extracts email drafts that the model wrote as inline text
 * instead of using the emailDraft tool. Returns the parsed email and any
 * surrounding non-email text so the UI can render the card component.
 */

export interface ParsedInlineEmail {
  to: string;
  subject: string;
  body: string;
}

export interface ParseResult {
  /** Text before the detected email (may be empty) */
  before: string;
  /** The extracted email, if one was detected */
  email: ParsedInlineEmail | null;
  /** Text after the detected email (may be empty) */
  after: string;
}

/**
 * Attempts to detect an inline email draft in markdown/plain text.
 * Looks for a "Subject:" line followed by email-body-like content.
 * Returns null email if no pattern is detected.
 */
export function parseInlineEmail(text: string): ParseResult {
  // Match a Subject: line (possibly preceded by a horizontal rule or whitespace)
  const subjectPattern = /^(?:---+\s*\n\s*)?(?:\*{0,2})Subject:\s*(.+)/im;
  const match = subjectPattern.exec(text);

  if (!match) {
    return { before: text, email: null, after: "" };
  }

  const subjectLineStart = match.index;
  const subject = match[1].replace(/\*{1,2}/g, "").trim();

  // Everything before the subject line is "before" text
  const before = text.slice(0, subjectLineStart).trim();

  // Everything after the subject line is potential email body
  const afterSubject = text.slice(subjectLineStart + match[0].length).trim();

  // Try to extract a "To:" line if present near the subject
  let to = "";
  let bodyText = afterSubject;

  const toPattern = /^(?:\*{0,2})To:\s*(.+)/im;
  const toMatch = toPattern.exec(bodyText);
  if (toMatch && toMatch.index < 50) {
    to = toMatch[1].replace(/\*{1,2}/g, "").trim();
    bodyText = bodyText.slice(toMatch.index + toMatch[0].length).trim();
  }

  // Strip leading "Dear X," or "Hi X," greeting artifacts that are part of the body
  // but keep them in the body since they're intentional email content

  // Look for a trailing offer/question from the assistant after the email
  // (e.g. "Would you like me to draft this email for you?")
  // These usually appear after a horizontal rule or double newline at the end
  let after = "";
  const trailingOfferPattern =
    /\n(?:---+\s*\n\s*)?(?:Would you like|Let me know|I can also|Should I|Do you want|Feel free)[^\n]+$/i;
  const trailingMatch = trailingOfferPattern.exec(bodyText);
  if (trailingMatch) {
    after = trailingMatch[0].trim().replace(/^---+\s*/, "");
    bodyText = bodyText.slice(0, trailingMatch.index).trim();
  }

  // Strip trailing signature placeholders
  bodyText = bodyText
    .replace(/\[Your (?:Name|Position|Contact Information)\]\s*/g, "")
    .replace(/(?:Best regards|Sincerely|Regards|Thank you),?\s*\n?\s*$/i, (m) => m)
    .replace(/Harco Fittings\s*$/, "")
    .trim();

  // Only consider it a real email if the body has meaningful content
  if (bodyText.length < 20) {
    return { before: text, email: null, after: "" };
  }

  return {
    before,
    email: { to, subject, body: bodyText },
    after,
  };
}
