import type { TripDay } from "./queries";

/** Current date in Tokyo (YYYY-MM-DD). */
export function tokyoToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

export function statusFor(date: string, today: string): "lived" | "today" | "planned" {
  return date < today ? "lived" : date === today ? "today" : "planned";
}

export type ReplanDay = { date: string; city: string; kind: string; summary: string };

/** Only days strictly after today may be rewritten; past and current days are kept. */
export function replanUpdates(days: TripDay[], proposal: ReplanDay[], today: string) {
  const byDate = new Map(proposal.map(p => [p.date, p]));
  return days
    .filter(d => d.date > today && byDate.has(d.date))
    .map(d => {
      const p = byDate.get(d.date)!;
      return { id: d.id, city: p.city, kind: p.kind, summary: p.summary };
    });
}
