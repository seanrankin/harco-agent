// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChunkErrorBoundary } from "./chunk-error-boundary";

afterEach(cleanup);

function ProblemChild(): React.ReactNode {
  throw new Error("Chunk load failed");
}

describe("ChunkErrorBoundary", () => {
  it("renders children normally when no error occurs", () => {
    render(
      <ChunkErrorBoundary>
        <p>Content loaded</p>
      </ChunkErrorBoundary>
    );

    expect(screen.getByText("Content loaded")).toBeDefined();
  });

  it('renders "Unable to load content" when a child throws an error', () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ChunkErrorBoundary>
        <ProblemChild />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText("Unable to load content")).toBeDefined();
    spy.mockRestore();
  });

  it("does not crash the parent component when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <div data-testid="parent">
        <p>Sibling content</p>
        <ChunkErrorBoundary>
          <ProblemChild />
        </ChunkErrorBoundary>
      </div>
    );

    // Parent and sibling remain intact
    expect(screen.getByText("Sibling content")).toBeDefined();
    expect(screen.getByText("Unable to load content")).toBeDefined();
    expect(container.querySelector("[data-testid='parent']")).not.toBeNull();

    spy.mockRestore();
  });
});
