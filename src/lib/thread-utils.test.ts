import { describe, expect, it } from "vitest";
import { classifyDateGroup, truncatePreview, validateTitle } from "./thread-utils";

describe("classifyDateGroup", () => {
  it('returns "today" for a date earlier today', () => {
    const now = new Date();
    const earlierToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0);
    expect(classifyDateGroup(earlierToday)).toBe("today");
  });

  it('returns "today" for right now', () => {
    expect(classifyDateGroup(new Date())).toBe("today");
  });

  it('returns "earlier-this-week" for a date earlier this week but not today', () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    if (daysSinceMonday === 0) {
      // Today is Monday, so there's no "earlier this week" that's before today
      return;
    }

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0);
    expect(classifyDateGroup(yesterday)).toBe("earlier-this-week");
  });

  it('returns "earlier" for a date last week', () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 10);
    expect(classifyDateGroup(lastWeek)).toBe("earlier");
  });

  it('returns "earlier" for a very old date', () => {
    expect(classifyDateGroup(new Date("2020-01-01"))).toBe("earlier");
  });
});

describe("truncatePreview", () => {
  it("returns text unchanged if within default max", () => {
    const text = "Short text";
    expect(truncatePreview(text)).toBe(text);
  });

  it("returns text unchanged if exactly 50 chars", () => {
    const text = "a".repeat(50);
    expect(truncatePreview(text)).toBe(text);
  });

  it("truncates text longer than 50 chars with ellipsis", () => {
    const text = "a".repeat(60);
    const result = truncatePreview(text);
    expect(result.length).toBe(50);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  it("respects custom max parameter", () => {
    const text = "Hello, world!";
    const result = truncatePreview(text, 5);
    expect(result).toBe("Hell\u2026");
    expect(result.length).toBe(5);
  });

  it("returns empty string unchanged", () => {
    expect(truncatePreview("")).toBe("");
  });
});

describe("validateTitle", () => {
  it("accepts a valid title", () => {
    expect(validateTitle("My Thread")).toEqual({ valid: true });
  });

  it("rejects empty string", () => {
    const result = validateTitle("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects whitespace-only string", () => {
    const result = validateTitle("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts title at exactly 100 chars after trim", () => {
    const title = "a".repeat(100);
    expect(validateTitle(title)).toEqual({ valid: true });
  });

  it("rejects title exceeding 100 chars after trim", () => {
    const title = "a".repeat(101);
    const result = validateTitle(title);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("trims whitespace before validating length", () => {
    const title = "  " + "a".repeat(100) + "  ";
    expect(validateTitle(title)).toEqual({ valid: true });
  });

  it("rejects when trimmed content exceeds 100 chars", () => {
    const title = "  " + "a".repeat(101) + "  ";
    const result = validateTitle(title);
    expect(result.valid).toBe(false);
  });
});
