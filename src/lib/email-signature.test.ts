import { describe, it, expect } from "vitest";
import { appendSignature, getInitials } from "./email-signature";

describe("appendSignature", () => {
  it("appends signature with displayName and email", () => {
    const result = appendSignature("Hello there", "John Smith", "john@harco.com");
    expect(result).toBe("Hello there\n\nBest,\nJohn Smith\njohn@harco.com\nHarco Fittings");
  });

  it("falls back to email when displayName is null", () => {
    const result = appendSignature("Hello", null, "john@harco.com");
    expect(result).toBe("Hello\n\nBest,\njohn@harco.com\nHarco Fittings");
  });

  it("falls back to email when displayName is undefined", () => {
    const result = appendSignature("Hello", undefined, "john@harco.com");
    expect(result).toBe("Hello\n\nBest,\njohn@harco.com\nHarco Fittings");
  });

  it("falls back to email when displayName is empty string", () => {
    const result = appendSignature("Hello", "", "john@harco.com");
    expect(result).toBe("Hello\n\nBest,\njohn@harco.com\nHarco Fittings");
  });

  it("falls back to email when displayName is whitespace only", () => {
    const result = appendSignature("Hello", "   ", "john@harco.com");
    expect(result).toBe("Hello\n\nBest,\njohn@harco.com\nHarco Fittings");
  });

  it("separates body from signature with exactly one blank line", () => {
    const result = appendSignature("Body text", "Jane", "jane@harco.com");
    expect(result).toContain("Body text\n\nBest,");
  });
});

describe("getInitials", () => {
  it("returns first and last initials for two-word name", () => {
    expect(getInitials("John Smith")).toBe("JS");
  });

  it("returns first and last initials for multi-word name", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MW");
  });

  it("returns single initial for single-word name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("returns first letter of email when displayName is null", () => {
    expect(getInitials(null, "john@harco.com")).toBe("J");
  });

  it("returns first letter of email when displayName is empty", () => {
    expect(getInitials("", "jane@harco.com")).toBe("J");
  });

  it("returns ? when both are null/undefined", () => {
    expect(getInitials(null, null)).toBe("?");
  });
});
