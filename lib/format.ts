// Date + number formatting helpers.

function toDate(input: string | Date): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/** "3 May 2026" */
export function formatDate(input: string | Date): string {
  return toDate(input).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "9 Oct" */
export function formatMonthDay(input: string | Date): string {
  return toDate(input).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** "Oct" */
export function shortMonth(input: string | Date): string {
  return toDate(input).toLocaleDateString("en-US", { month: "short" });
}

/** Soft, estimate-flavoured date: "early October", "mid-October", "late October" */
export function softDate(input: string | Date): string {
  const d = toDate(input);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const part = day <= 10 ? "early " : day <= 20 ? "mid-" : "late ";
  return `${part}${month}`;
}

/** Whole days between an ISO date and now (positive = in the past). */
export function daysAgo(input: string | Date): number {
  return Math.round((Date.now() - toDate(input).getTime()) / 86_400_000);
}

/** Whole weeks between two dates, rounded, minimum 1. */
export function weeksBetween(from: string | Date, to: string | Date): number {
  const ms = toDate(to).getTime() - toDate(from).getTime();
  return Math.max(1, Math.round(ms / (7 * 86_400_000)));
}
