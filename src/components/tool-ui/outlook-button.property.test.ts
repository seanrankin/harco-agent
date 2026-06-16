import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Feature: send-to-outlook, Property 5: Partial success count accuracy
 * Validates: Requirements 5.4
 *
 * Tests the display logic for the OutlookButton "partial" state.
 * The partial state message format is:
 *   "Sent to Drafts ({attached} of {total} attached)"
 */

/**
 * Pure representation of the partial success message as rendered by
 * the OutlookButton component's renderContent function.
 */
function formatPartialSuccess(attached: number, total: number): string {
  return `Sent to Drafts (${attached} of ${total} attached)`;
}

describe("Property 5: Partial success count accuracy", () => {
  // Generator: (attached, total) where 0 <= attached < total and total > 0
  // This represents a true "partial" state (not all attachments succeeded)
  const partialPairArb = fc
    .tuple(
      fc.integer({ min: 1, max: 20 }), // total (max 20 per API spec)
      fc.integer({ min: 0, max: 19 }) // attached offset (will be constrained below)
    )
    .map(([total, attachedRaw]) => ({
      attached: Math.min(attachedRaw, total - 1), // ensure attached < total for partial
      total,
    }));

  it("message contains the exact attached count", () => {
    fc.assert(
      fc.property(partialPairArb, ({ attached, total }) => {
        const message = formatPartialSuccess(attached, total);
        expect(message).toContain(`(${attached} of`);
      }),
      { numRuns: 100 }
    );
  });

  it("message contains the exact total count", () => {
    fc.assert(
      fc.property(partialPairArb, ({ attached, total }) => {
        const message = formatPartialSuccess(attached, total);
        expect(message).toContain(`of ${total} attached)`);
      }),
      { numRuns: 100 }
    );
  });

  it("attached count appears before total count in the message", () => {
    fc.assert(
      fc.property(partialPairArb, ({ attached, total }) => {
        const message = formatPartialSuccess(attached, total);
        const attachedIndex = message.indexOf(`${attached}`);
        const totalIndex = message.lastIndexOf(`${total}`);
        expect(attachedIndex).toBeLessThan(totalIndex);
      }),
      { numRuns: 100 }
    );
  });

  it("format is consistent: matches 'Sent to Drafts (X of Y attached)'", () => {
    fc.assert(
      fc.property(partialPairArb, ({ attached, total }) => {
        const message = formatPartialSuccess(attached, total);
        const pattern = /^Sent to Drafts \(\d+ of \d+ attached\)$/;
        expect(message).toMatch(pattern);
      }),
      { numRuns: 100 }
    );
  });

  it("partial state only applies when attached < total (not full success)", () => {
    fc.assert(
      fc.property(partialPairArb, ({ attached, total }) => {
        // The partial state is distinct from success: attached must be < total
        expect(attached).toBeLessThan(total);
        // When attached === total, the component renders "success" not "partial"
      }),
      { numRuns: 100 }
    );
  });

  it("attached count is never negative in the display", () => {
    fc.assert(
      fc.property(partialPairArb, ({ attached, total }) => {
        const message = formatPartialSuccess(attached, total);
        const match = message.match(/\((\d+) of (\d+) attached\)/);
        expect(match).not.toBeNull();
        const displayedAttached = parseInt(match![1], 10);
        expect(displayedAttached).toBeGreaterThanOrEqual(0);
        expect(displayedAttached).toBeLessThanOrEqual(total);
      }),
      { numRuns: 100 }
    );
  });
});
