export type DateGroup = "today" | "earlier-this-week" | "earlier";

export function classifyDateGroup(updatedAt: Date): DateGroup {
  const now = new Date();

  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (updatedAt >= todayMidnight) {
    return "today";
  }

  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday,
  );

  if (updatedAt >= mondayMidnight) {
    return "earlier-this-week";
  }

  return "earlier";
}

export function truncatePreview(text: string, max: number = 50): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 1) + "\u2026";
}

export function validateTitle(title: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Title cannot be empty" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Title must be 100 characters or fewer" };
  }

  return { valid: true };
}
