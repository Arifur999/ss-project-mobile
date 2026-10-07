// An attendance row's shift, lifted from Hatim/src/pages/employees/
// EmployeeAttendance.tsx (parseTimeToMinutes, calculateTotalHours,
// normalizeTimeForInput, parseLegacyAttendanceNotes and getAttendanceDisplay):
// times read as "09:30" or "9:30 AM", a shift past midnight counted to the
// next day, and older rows whose times were written into the notes read back
// from there. The wording of the hours is left to the screen.

type Row = Record<string, any>;

/** Minutes after midnight, or null when the time cannot be read. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const amPm = raw.match(/\s*(AM|PM)$/i);
  const parts = raw.replace(/\s*(AM|PM)$/i, '').trim().split(':');
  if (parts.length < 2) return null;
  let hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (amPm) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (amPm[1].toUpperCase() === 'PM') hour += 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

/** "09:30", the form the server stores, or '' when the time cannot be read. */
export function normalizeTime(value: string | null | undefined): string {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return '';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Hours between two times to two places - a shift that ends before it starts ran past midnight. */
export function shiftHours(start: string, end: string): number {
  const from = parseTimeToMinutes(start);
  const to = parseTimeToMinutes(end);
  if (from === null || to === null) return 0;
  let diff = to - from;
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

/** Hours as whole hours and minutes, for the screen to word. */
export function hoursAndMinutes(hours: number): { hours: number; minutes: number } {
  const safe = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const whole = Math.floor(safe);
  return { hours: whole, minutes: Math.round((safe - whole) * 60) };
}

/** An older row's times, written into its notes as "Start Time: … End Time: … Total Hours: …". */
export function legacyAttendanceNotes(notes: string | null | undefined) {
  const text = String(notes || '');
  const start = text.match(/Start Time:\s*(.*?)(?=\s*End Time:|\s*Total Hours:|$)/i);
  const end = text.match(/End Time:\s*(.*?)(?=\s*Start Time:|\s*Total Hours:|$)/i);
  const total = text.match(/Total Hours:\s*(.*?)(?=\s*Start Time:|\s*End Time:|$)/i);
  const firstLabel = ['Start Time:', 'End Time:', 'Total Hours:']
    .map((label) => text.toLowerCase().indexOf(label.toLowerCase()))
    .filter((index) => index >= 0);
  const cut = firstLabel.length ? Math.min(...firstLabel) : -1;
  return {
    start_time: normalizeTime(start?.[1]),
    end_time: normalizeTime(end?.[1]),
    total_hours_label: total?.[1]?.trim() || '',
    notes: cut >= 0 ? text.slice(0, cut).trim() : text.trim(),
  };
}

/**
 * What a row shows: its times (from the columns, else the old notes), its
 * hours (stored, else the old label, else worked out) and the notes without
 * the old time lines.
 */
export function attendanceDisplay(att: Row) {
  const legacy = legacyAttendanceNotes(att.notes);
  const start = normalizeTime(att.start_time) || legacy.start_time;
  const end = normalizeTime(att.end_time) || legacy.end_time;
  const stored = Number(att.total_hours);
  return {
    start_time: start,
    end_time: end,
    hours: Number.isFinite(stored) && stored > 0 ? stored : shiftHours(start, end),
    legacyLabel: Number.isFinite(stored) && stored > 0 ? '' : legacy.total_hours_label,
    notes: legacy.notes,
  };
}
