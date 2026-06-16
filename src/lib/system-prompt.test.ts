import { describe, it, expect } from "vitest";
import { buildUserPreamble } from "./system-prompt";

describe("buildUserPreamble", () => {
  it("returns an empty string when no display name is provided", () => {
    expect(buildUserPreamble()).toBe("");
    expect(buildUserPreamble("")).toBe("");
    expect(buildUserPreamble(undefined)).toBe("");
  });

  it("includes the display name when provided", () => {
    expect(buildUserPreamble("Jane Doe")).toContain("Jane Doe");
  });

  it("instructs the model not to use names from the documents", () => {
    const preamble = buildUserPreamble("Jane Doe");
    expect(preamble).toMatch(/never address the user by any personal name found in the context/i);
  });
});
