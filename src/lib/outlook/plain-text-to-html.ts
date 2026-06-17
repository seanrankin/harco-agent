/**
 * Convert a plain-text email body into HTML for the Microsoft Graph draft body
 * (which is sent with contentType "HTML"). Without this, newlines collapse into
 * spaces and the email arrives as one run-on block.
 */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n/g, "<br>");
}
