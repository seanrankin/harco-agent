import { visit, SKIP } from "unist-util-visit";
import type { Root, Text, Link, PhrasingContent } from "mdast";

/**
 * Sentinel value on the `title` attribute that marks a citation link.
 * The `a` component override in `markdown-text.tsx` looks for this exact
 * string to swap the anchor for a styled citation badge.
 */
export const CITATION_TITLE = "__citation__";

const CITATION_RE = /\[(\d+)\]/g;

/**
 * Remark plugin that rewrites inline `[N]` tokens (e.g. `[1]`, `[2]`) in the
 * assistant's prose into clickable links pointing at the corresponding source
 * row in the Sources footer (`#source-N`).
 *
 * The conversion is purely textual — it relies on the agreed convention that
 * source N in `data-sources` is rendered with `id="source-N"` (see
 * `src/components/tool-ui/source-attachments.tsx`).
 *
 * Skips text inside `code`, `inlineCode`, and `link` nodes so we don't mangle
 * code snippets or existing markdown links that happen to contain `[N]`.
 */
export function remarkCitations() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      // `code` and `inlineCode` are leaf nodes (value-typed, no children),
      // so they can't appear as `parent` here — TS narrows them out.
      if (
        !parent ||
        index === null ||
        index === undefined ||
        parent.type === "link" ||
        parent.type === "linkReference"
      ) {
        return;
      }

      const value = node.value;
      if (!CITATION_RE.test(value)) {
        CITATION_RE.lastIndex = 0;
        return;
      }
      CITATION_RE.lastIndex = 0;

      const newChildren: PhrasingContent[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = CITATION_RE.exec(value)) !== null) {
        const [full, numStr] = match;
        const start = match.index;
        if (start > lastIndex) {
          newChildren.push({
            type: "text",
            value: value.slice(lastIndex, start),
          });
        }

        const link: Link = {
          type: "link",
          url: `#source-${numStr}`,
          title: CITATION_TITLE,
          children: [{ type: "text", value: full }],
        };
        newChildren.push(link);

        lastIndex = start + full.length;
      }

      if (lastIndex < value.length) {
        newChildren.push({
          type: "text",
          value: value.slice(lastIndex),
        });
      }

      parent.children.splice(index, 1, ...newChildren);
      return [SKIP, index + newChildren.length];
    });
  };
}
