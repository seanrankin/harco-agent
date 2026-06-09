import type { FC } from "react";

interface DiamondProps {
  size?: number;
  /** Fill color for the diamond shape. Defaults to `currentColor`. */
  color?: string;
  /** Color of the HARCO wordmark. Defaults to `--background` (paper). */
  ink?: string;
  className?: string;
}

/**
 * Harco brand diamond mark. Aspect ratio is 2:1 (width:height).
 * Used in the sidebar, empty state, bot avatar, and auth screens.
 */
export const Diamond: FC<DiamondProps> = ({
  size = 30,
  color = "currentColor",
  ink = "var(--background)",
  className,
}) => {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 240 120"
      className={className}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <polygon points="120,8 232,60 120,112 8,60" fill={color} />
      <text
        x="120"
        y="72"
        textAnchor="middle"
        fontFamily='"Inter Tight", sans-serif'
        fontSize="30"
        fontWeight="700"
        fill={ink}
        letterSpacing="2"
      >
        HARCO
      </text>
    </svg>
  );
};
