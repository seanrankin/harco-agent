import { describe, it, expect } from "vitest";
import { plainTextToHtml } from "./plain-text-to-html";

describe("plainTextToHtml", () => {
  it("converts a single newline to <br>", () => {
    expect(plainTextToHtml("line one\nline two")).toBe("line one<br>line two");
  });

  it("converts a blank line (double newline) to <br><br>", () => {
    expect(plainTextToHtml("Dear X,\n\nHello.\n\nBest,")).toBe(
      "Dear X,<br><br>Hello.<br><br>Best,"
    );
  });

  it("escapes HTML special characters", () => {
    expect(plainTextToHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("normalizes CRLF to a single <br>", () => {
    expect(plainTextToHtml("line one\r\nline two")).toBe("line one<br>line two");
  });

  it("returns plain text without newlines unchanged", () => {
    expect(plainTextToHtml("no breaks here")).toBe("no breaks here");
  });
});
