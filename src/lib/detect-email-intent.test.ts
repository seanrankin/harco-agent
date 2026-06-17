import { describe, it, expect } from "vitest";
import { detectEmailIntent } from "@/lib/detect-email-intent";

describe("detectEmailIntent", () => {
  describe("positive cases - explicit email creation intent", () => {
    it("detects 'draft an email'", () => {
      expect(detectEmailIntent("draft an email")).toEqual({
        hasEmailIntent: true,
      });
    });

    it("detects 'write me an email'", () => {
      expect(detectEmailIntent("write me an email")).toEqual({
        hasEmailIntent: true,
      });
    });

    it("detects 'can you draft the cover email'", () => {
      expect(detectEmailIntent("can you draft the cover email")).toEqual({ hasEmailIntent: true });
    });

    it("detects 'put together an email for them'", () => {
      expect(detectEmailIntent("put together an email for them")).toEqual({ hasEmailIntent: true });
    });

    it("detects 'email them about this'", () => {
      expect(detectEmailIntent("email them about this")).toEqual({
        hasEmailIntent: true,
      });
    });

    it("detects 'send them an email about the valves'", () => {
      expect(detectEmailIntent("send them an email about the valves")).toEqual({
        hasEmailIntent: true,
      });
    });
  });

  describe("negative cases - email as noun or existing email reference", () => {
    it("rejects 'email me the document'", () => {
      expect(detectEmailIntent("email me the document")).toEqual({
        hasEmailIntent: false,
      });
    });

    it("rejects 'what's in the email?'", () => {
      expect(detectEmailIntent("what's in the email?")).toEqual({
        hasEmailIntent: false,
      });
    });

    it("rejects 'the email says...'", () => {
      expect(detectEmailIntent("the email says something important")).toEqual({
        hasEmailIntent: false,
      });
    });

    it("rejects 'from the email source'", () => {
      expect(detectEmailIntent("from the email source")).toEqual({
        hasEmailIntent: false,
      });
    });

    it("rejects 'check the email attachment'", () => {
      expect(detectEmailIntent("check the email attachment")).toEqual({
        hasEmailIntent: false,
      });
    });
  });

  describe("edge cases", () => {
    it("rejects 'draft' without 'email'", () => {
      expect(detectEmailIntent("draft a letter to the team")).toEqual({
        hasEmailIntent: false,
      });
    });

    it("rejects 'email' as standalone noun", () => {
      expect(detectEmailIntent("I got an email yesterday")).toEqual({
        hasEmailIntent: false,
      });
    });

    it("handles mixed case correctly", () => {
      expect(detectEmailIntent("Draft An Email about the project")).toEqual({
        hasEmailIntent: true,
      });
    });

    it("handles UPPER CASE", () => {
      expect(detectEmailIntent("WRITE ME AN EMAIL")).toEqual({
        hasEmailIntent: true,
      });
    });

    it("rejects queries about email content with no creation intent", () => {
      expect(detectEmailIntent("summarize the email for me")).toEqual({
        hasEmailIntent: false,
      });
    });
  });
});
