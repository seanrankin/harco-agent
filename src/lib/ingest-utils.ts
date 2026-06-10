const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_CHUNK_OVERLAP = 200;

export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  const charSize = chunkSize * 4;
  const charOverlap = overlap * 4;
  const step = charSize - charOverlap;

  let truncatedText = text;
  const estimatedChunks = Math.ceil(text.length / step);
  if (estimatedChunks > 50000) {
    truncatedText = text.slice(0, 10_000_000);
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < truncatedText.length) {
    const end = Math.min(start + charSize, truncatedText.length);
    chunks.push(truncatedText.slice(start, end));
    start += step;
    if (start >= truncatedText.length) break;
  }

  return chunks;
}

/**
 * Patterns that indicate the start of an email signature block.
 * Add new entries here when staff signatures change.
 */
const SIGNATURE_START_PATTERNS = [
  /^--\s*$/, // standard sig delimiter
  /^John D\. Fralick/,
  /^National Sales Manager/,
  /^Harco Fittings LLC/,
  /^\(\d{3}\) \d{3}-\d{4}/, // phone number as first item on a line
];

export function stripEmailNoise(text: string): string {
  // Remove image CID references like [cid:image001.gif@01DCF764.4F68C9D0]
  text = text.replace(/\[cid:[^\]]+\]/g, "");

  // Remove URL markup like www.example.com<http://www.example.com/>
  text = text.replace(/(\S+)<https?:\/\/[^>]+>/g, "$1");

  // Remove long To: lines with multiple email addresses
  text = text.replace(/^To:.*(?:\n(?=\S).*@.*)*$/gm, "");

  // Remove Sent: lines
  text = text.replace(/^Sent:.*$/gm, "");

  // Remove signature blocks
  const lines = text.split("\n");
  const cleaned: string[] = [];
  let inSignature = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (SIGNATURE_START_PATTERNS.some((p) => p.test(trimmed))) {
      inSignature = true;
      continue;
    }
    if (/^From:/.test(trimmed) && inSignature) {
      inSignature = false;
    }
    if (!inSignature) {
      cleaned.push(line);
    }
  }

  return cleaned
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
