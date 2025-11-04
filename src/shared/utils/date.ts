// Utilidades de fechas compartidas

export type TimelineInputLike = {
  startDate?: string | Date;
  endDate?: string | Date;
  estimatedDuration?: number;
} | undefined;

export function parseTimeline(input: TimelineInputLike) {
  if (!input) return undefined;
  const toDate = (v?: string | Date) =>
    typeof v === 'string' ? new Date(v) : v;
  return {
    startDate: toDate(input.startDate),
    endDate: toDate(input.endDate),
    estimatedDuration: input.estimatedDuration,
  };
}
