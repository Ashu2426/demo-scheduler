/**
 * All offices are currently in India, so the app uses a single fixed timezone
 * (IST, UTC+5:30, no DST) for input and display. Times are stored in UTC.
 *
 * If an office outside India is ever added, this is the file to revisit —
 * swap the fixed offset for per-office timezone conversion.
 */

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MS_PER_MINUTE = 60_000;

/** Converts a `datetime-local` input value ("2026-08-25T14:00") to a UTC Date. */
export function istInputToUtc(value: string): Date {
  return new Date(`${value}:00+05:30`);
}

/** Converts a stored UTC Date back to a `datetime-local` input value. */
export function utcToIstInput(date: Date): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, 16);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatRange(start: Date, end: Date): string {
  return `${formatDate(start)} · ${formatTime(start)}–${formatTime(end)} IST`;
}

/** The window during which the environment must not be touched. */
export function freezeWindow(demo: { startTime: Date; endTime: Date; bufferMinutes: number }) {
  return {
    start: new Date(demo.startTime.getTime() - demo.bufferMinutes * MS_PER_MINUTE),
    end: new Date(demo.endTime.getTime() + demo.bufferMinutes * MS_PER_MINUTE),
  };
}

/** Calendar days between now and the demo, in IST. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const toIstMidnight = (d: Date) => {
    const shifted = new Date(d.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  };
  return Math.round((toIstMidnight(date) - toIstMidnight(now)) / (24 * 60 * MS_PER_MINUTE));
}

/** IST-aware year/month/day parts, used to lay out the calendar grid. */
export function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}
