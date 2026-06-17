import { describe, it, expect } from "vitest";
import { isLegacyExchangeAddress } from "./email-preview";

describe("isLegacyExchangeAddress", () => {
  it("flags IMCEAEX-wrapped X.500 addresses", () => {
    const addr =
      "IMCEAEX-_O=HARCO_OU=EXCHANGE+20ADMINISTRATIVE+20GROUP+20+28FYDIBOHF23SPDLT+29_CN=RECIPIENTS_CN=JRIORDAN@eurprd05.prod.outlook.com";
    expect(isLegacyExchangeAddress(addr)).toBe(true);
  });

  it("flags bare X.500 DN addresses", () => {
    expect(isLegacyExchangeAddress("/O=HARCO/OU=Exchange/CN=Recipients/CN=jriordan")).toBe(true);
  });

  it("flags absurdly long local parts", () => {
    expect(isLegacyExchangeAddress(`${"x".repeat(70)}@harco.com`)).toBe(true);
  });

  it("allows normal addresses", () => {
    expect(isLegacyExchangeAddress("james.riordan@harcofittings.com")).toBe(false);
  });

  it("allows plain display names", () => {
    expect(isLegacyExchangeAddress("James Riordan")).toBe(false);
  });

  it("returns false for empty/nullish values", () => {
    expect(isLegacyExchangeAddress("")).toBe(false);
    expect(isLegacyExchangeAddress(null)).toBe(false);
    expect(isLegacyExchangeAddress(undefined)).toBe(false);
  });
});
