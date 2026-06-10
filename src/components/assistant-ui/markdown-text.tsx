"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { type FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { FileCard } from "@/components/tool-ui/file-card";
import { cn } from "@/lib/utils";
import { remarkCitations, CITATION_TITLE } from "@/lib/citations/remark-citations";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkCitations]}
      className="aui-md"
      components={defaultComponents}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="aui-code-header-root border-border/50 bg-muted/50 mt-2.5 flex items-center justify-between rounded-t-lg border border-b-0 px-3 py-1.5 text-xs">
      <span className="aui-code-header-language text-muted-foreground font-medium lowercase">
        {language}
      </span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(value).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), copiedDuration);
      },
      () => {}
    );
  };

  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "aui-md-h1 mb-2 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "aui-md-h2 mt-3 mb-1.5 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "aui-md-h3 mt-2.5 mb-1 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "aui-md-h4 mt-2 mb-1 scroll-m-20 text-sm font-medium first:mt-0 last:mb-0",
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn("aui-md-h5 mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn("aui-md-h6 mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("aui-md-p my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, title, children, ...props }) => {
    // Citation badge: rendered when the remark-citations plugin marks the
    // link with the CITATION_TITLE sentinel. The visible text is `[N]`.
    if (title === CITATION_TITLE) {
      const label = typeof children === "string" ? children : null;
      const text =
        label ?? (Array.isArray(children) && typeof children[0] === "string" ? children[0] : "");
      const numStr = String(text).replace(/[^\d]/g, "");
      return (
        <a
          {...props}
          aria-label={`Citation ${numStr}`}
          className="bg-ring/10 text-ring hover:bg-ring/20 mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 align-[1px] font-mono text-[9.5px] font-semibold no-underline transition-colors"
          onClick={(e) => {
            const id = (props.href ?? "").replace(/^#/, "");
            const el = typeof document !== "undefined" ? document.getElementById(id) : null;
            if (el) {
              e.preventDefault();
              el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }}
        >
          {numStr}
        </a>
      );
    }

    // Intercept /api/download links and render as FileCard instead
    const href = props.href ?? "";
    if (href.includes("/api/download") && href.includes("document_id=")) {
      const url = new URL(href, "http://localhost");
      const documentId = url.searchParams.get("document_id") ?? "";
      const linkText =
        typeof children === "string"
          ? children
          : Array.isArray(children) && typeof children[0] === "string"
            ? children[0]
            : "Document";
      return <FileCard documentId={documentId} title={linkText} fileType="pdf" />;
    }

    return (
      <a
        title={title}
        className={cn(
          "aui-md-a text-primary hover:text-primary/80 underline underline-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-2.5 border-s-2 ps-3 italic",
        className
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "aui-md-ul marker:text-muted-foreground my-2 ms-4 list-disc [&>li]:mt-1",
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-md-ol marker:text-muted-foreground my-2 ms-4 list-decimal [&>li]:mt-1",
        className
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("aui-md-hr border-muted-foreground/20 my-2", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <table
      className={cn(
        // border-separate + spacing-0 so rounded-corners + inner cell borders coexist
        "aui-md-table bg-card border-border my-3 w-full overflow-hidden rounded-[10px] border border-separate border-spacing-0",
        className
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-md-th bg-muted/40 text-muted-foreground border-border/60 border-b px-3.5 py-2.5 text-start font-mono text-[10px] font-semibold tracking-wider uppercase first:border-r [[align=center]]:text-center [[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-md-td text-primary border-border/60 border-b px-3.5 py-2.5 text-start font-mono text-xs font-medium first:bg-muted/40 first:text-muted-foreground first:border-r first:font-semibold first:tracking-wider first:uppercase first:text-[11px] [[align=center]]:text-center [[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        // last row drops its bottom border (cells handle the row separator now)
        "aui-md-tr [&:last-child>td]:border-b-0",
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("aui-md-li leading-normal", className)} {...props} />
  ),
  sup: ({ className, ...props }) => (
    <sup className={cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed",
        className
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "aui-md-inline-code border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
          className
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});
