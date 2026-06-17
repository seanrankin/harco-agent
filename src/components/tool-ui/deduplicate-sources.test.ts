import { describe, it, expect } from "vitest";
import { deduplicateSources } from "./deduplicate-sources";
import type { SourceDocument } from "@/lib/types";

const doc = (id: string, title = id): SourceDocument => ({
  id,
  title,
  file_type: "pdf",
  file_size_bytes: 1000,
});

describe("deduplicateSources", () => {
  it("removes sources that are also shown as file cards", () => {
    const sources = [doc("a"), doc("b")];
    expect(deduplicateSources(sources, ["a"])).toEqual([doc("b")]);
  });

  it("removes duplicate sources within the list, keeping the first", () => {
    const sources = [doc("a", "first"), doc("b"), doc("a", "second")];
    expect(deduplicateSources(sources, [])).toEqual([doc("a", "first"), doc("b")]);
  });

  it("matches ids case-insensitively for both file cards and duplicates", () => {
    const sources = [doc("ABC"), doc("abc"), doc("DEF")];
    expect(deduplicateSources(sources, ["def"])).toEqual([doc("ABC")]);
  });

  it("returns all sources when there are no duplicates or file cards", () => {
    const sources = [doc("a"), doc("b")];
    expect(deduplicateSources(sources, [])).toEqual(sources);
  });
});
