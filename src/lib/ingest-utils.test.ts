import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { chunkText, stripEmailNoise, stripForwardLayer } from "./ingest-utils";

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns single-element array for short text", () => {
    const text = "Hello, world!";
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it("property: chunks overlap correctly", () => {
    // Use small chunk params for fast test execution
    const chunkSize = 50;
    const overlap = 10;
    const charOverlap = overlap * 4; // 40
    const charSize = chunkSize * 4; // 200

    fc.assert(
      fc.property(fc.string({ minLength: charSize + 1, maxLength: charSize * 4 }), (text) => {
        const chunks = chunkText(text, chunkSize, overlap);
        if (chunks.length < 2) return;

        for (let i = 0; i < chunks.length - 1; i++) {
          const overlapLen = Math.min(charOverlap, chunks[i + 1].length);
          const endOfCurrent = chunks[i].slice(-overlapLen);
          const startOfNext = chunks[i + 1].slice(0, overlapLen);
          expect(endOfCurrent).toBe(startOfNext);
        }
      })
    );
  });

  it("property: all text is covered", () => {
    const chunkSize = 50;
    const overlap = 10;
    const charOverlap = overlap * 4; // 40

    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 2000 }), (text) => {
        const chunks = chunkText(text, chunkSize, overlap);
        if (chunks.length === 0) return;

        let reconstructed = chunks[0];
        for (let i = 1; i < chunks.length; i++) {
          reconstructed += chunks[i].slice(charOverlap);
        }
        expect(reconstructed).toBe(text);
      })
    );
  });

  it("property: chunk count is predictable", () => {
    const chunkSize = 50;
    const overlap = 10;
    const charSize = chunkSize * 4; // 200
    const charOverlap = overlap * 4; // 40
    const step = charSize - charOverlap; // 160

    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 3000 }), (text) => {
        const chunks = chunkText(text, chunkSize, overlap);
        const expectedCount = Math.ceil(text.length / step);
        expect(chunks.length).toBe(expectedCount);
      })
    );
  });

  it("truncates text that would produce more than 50000 chunks", () => {
    // chunkSize=500, overlap=0 => charSize=2000, step=2000
    // Need ceil(len/2000) > 50000 => len > 100_000_000
    // That's still large. Instead, verify the logic by using params where
    // the threshold is reachable within memory constraints.
    //
    // chunkSize=250, overlap=0 => charSize=1000, step=1000
    // Need ceil(len/1000) > 50000 => len > 50_000_000
    // After truncation to 10M: ceil(10_000_000/1000) = 10000 chunks
    const chunkSize = 250;
    const overlap = 0;
    const step = chunkSize * 4; // 1000

    const textLength = 50_001_000; // triggers threshold
    const text = "a".repeat(textLength);

    const chunks = chunkText(text, chunkSize, overlap);

    // Should be truncated to 10M chars
    const expectedChunks = Math.ceil(10_000_000 / step);
    expect(chunks.length).toBe(expectedChunks);
    expect(chunks.length).toBe(10000);
  });
});

describe("stripEmailNoise", () => {
  it("removes CID references", () => {
    const input = "See [cid:image001.gif@01DC] attached";
    const result = stripEmailNoise(input);
    expect(result).toBe("See  attached");
  });

  it("removes URL markup", () => {
    const input = "Visit www.harco.com<http://www.harco.com/>";
    const result = stripEmailNoise(input);
    expect(result).toBe("Visit www.harco.com");
  });

  it("removes Sent: lines", () => {
    const input = "Hello\nSent: Monday, January 1, 2024\nWorld";
    const result = stripEmailNoise(input);
    expect(result).toBe("Hello\n\nWorld");
  });

  it("removes signature blocks", () => {
    const input = [
      "Some content here",
      "John D. Fralick",
      "National Sales Manager",
      "Harco Fittings LLC",
      "(555) 123-4567",
      "From: someone@example.com",
      "More content after signature",
    ].join("\n");

    const result = stripEmailNoise(input);
    expect(result).toContain("Some content here");
    expect(result).not.toContain("John D. Fralick");
    expect(result).not.toContain("National Sales Manager");
    expect(result).not.toContain("Harco Fittings LLC");
    expect(result).not.toContain("(555) 123-4567");
    expect(result).toContain("More content after signature");
  });

  it("collapses excessive blank lines", () => {
    const input = "Hello\n\n\n\n\nWorld";
    const result = stripEmailNoise(input);
    expect(result).toBe("Hello\n\nWorld");
  });

  it("passes through clean text unchanged", () => {
    const input = "This is a normal paragraph.\n\nAnother paragraph here.";
    const result = stripEmailNoise(input);
    expect(result).toBe(input);
  });
});

describe("stripForwardLayer", () => {
  it("strips everything before and including forwarded headers", () => {
    const input = [
      "",
      "John D. Fralick",
      "National Sales Manager",
      "Harco Fittings LLC",
      "(434) 845-7094",
      "",
      "From: John Riordan <JRiordan@harcofittings.com>",
      "Sent: Saturday, April 27, 2013 2:07 PM",
      "To: Brian Hurley <BHurley@harcofittings.com>",
      "Subject: Info Blurt #30: Chris Menno",
      "",
      "All,",
      "",
      "Here is the actual content.",
    ].join("\n");

    const result = stripForwardLayer(input);
    expect(result).toBe("All,\n\nHere is the actual content.");
  });

  it("handles multi-line To: fields", () => {
    const input = [
      "Some signature",
      "",
      "From: John Riordan <JRiordan@harcofittings.com>",
      "Sent: Saturday, April 27, 2013 2:07 PM",
      "To: Brian Hurley <BHurley@harcofittings.com>;",
      "  Ed Eichmann <EEichmann@harcofittings.com>;",
      "  Jack Harrington <harcojbh@msn.com>",
      "Subject: Test subject",
      "",
      "Body content here.",
    ].join("\n");

    const result = stripForwardLayer(input);
    expect(result).toBe("Body content here.");
  });

  it("returns original text when no From: line found", () => {
    const input = "Just some text with no forward headers.";
    const result = stripForwardLayer(input);
    expect(result).toBe(input);
  });

  it("handles Cc: in forwarded headers", () => {
    const input = [
      "Signature stuff",
      "",
      "From: Someone <someone@example.com>",
      "Sent: Monday, January 1, 2024",
      "To: Recipient <recipient@example.com>",
      "Cc: Another <another@example.com>",
      "Subject: Test",
      "",
      "The real content.",
    ].join("\n");

    const result = stripForwardLayer(input);
    expect(result).toBe("The real content.");
  });
});
