import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { isEmailAllowed } from "./email";

describe("isEmailAllowed", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAILS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("example tests", () => {
    it("returns false for empty string", () => {
      expect(isEmailAllowed("")).toBe(false);
    });

    it("returns false for email without @", () => {
      expect(isEmailAllowed("noatsign")).toBe(false);
    });

    it("allows harcofittings.com when env var is empty", () => {
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAILS", "");
      expect(isEmailAllowed("user@harcofittings.com")).toBe(true);
    });

    it("allows harcofittings.com when env var is unset", () => {
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAILS", "");
      delete process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
      expect(isEmailAllowed("user@harcofittings.com")).toBe(true);
    });
  });

  describe("property tests", () => {
    // Feature: test-suite, Property 1: Allowed domain acceptance is case-insensitive
    // **Validates: Requirements 2.1, 2.4**
    it("Property 1: allowed domain acceptance is case-insensitive", () => {
      const localPartChars = fc.stringOf(
        fc.char().filter((c) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]$/.test(c)),
        { minLength: 1, maxLength: 30 },
      );

      const casedDomain = fc.constantFrom(
        "harcofittings.com",
        "HARCOFITTINGS.COM",
        "HarcoFittings.Com",
        "hArCoFiTtInGs.CoM",
        "HARCOFITTINGS.com",
        "harcofittings.COM",
        "HarcoFittings.COM",
      );

      fc.assert(
        fc.property(localPartChars, casedDomain, (local, domain) => {
          const email = `${local}@${domain}`;
          expect(isEmailAllowed(email)).toBe(true);
        }),
      );
    });

    // Feature: test-suite, Property 2: Non-allowed emails are rejected
    // **Validates: Requirements 2.2, 2.5, 2.6**
    it("Property 2: non-allowed emails are rejected", () => {
      const nonAllowedDomain = fc
        .domain()
        .filter((d) => d.toLowerCase() !== "harcofittings.com");

      const localPart = fc.stringOf(
        fc.char().filter((c) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]$/.test(c)),
        { minLength: 1, maxLength: 30 },
      );

      const emailWithWrongDomain = fc
        .tuple(localPart, nonAllowedDomain)
        .map(([local, domain]) => `${local}@${domain}`);

      const stringWithoutAt = fc
        .string({ minLength: 0, maxLength: 50 })
        .filter((s) => !s.includes("@"));

      const nonAllowedInput = fc.oneof(emailWithWrongDomain, stringWithoutAt);

      fc.assert(
        fc.property(nonAllowedInput, (input) => {
          expect(isEmailAllowed(input)).toBe(false);
        }),
      );
    });

    // Feature: test-suite, Property 3: Allowlist override accepts regardless of domain
    // **Validates: Requirements 2.3**
    it("Property 3: allowlist override accepts regardless of domain", () => {
      const localPart = fc.stringOf(
        fc.char().filter((c) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]$/.test(c)),
        { minLength: 1, maxLength: 20 },
      );

      const domain = fc.domain();

      const allowlistEmail = fc
        .tuple(localPart, domain)
        .map(([local, d]) => `${local}@${d}`);

      const allowlistEmails = fc.array(allowlistEmail, {
        minLength: 1,
        maxLength: 5,
      });

      fc.assert(
        fc.property(allowlistEmails, (emails) => {
          const envValue = emails
            .map((e) => {
              const rand = Math.random();
              if (rand < 0.33) return ` ${e} `;
              if (rand < 0.66) return e.toUpperCase();
              return e;
            })
            .join(",");

          vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAILS", envValue);

          for (const email of emails) {
            expect(isEmailAllowed(email)).toBe(true);
          }
        }),
      );
    });
  });
});
