// Utilidades de fechas compartidas

/**
 * Convierte un string o Date a Date, o retorna undefined si no hay valor
 */
export function parseDate(value?: string | Date): Date | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? new Date(value) : value;
}

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
