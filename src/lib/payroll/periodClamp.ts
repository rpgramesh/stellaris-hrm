export const isIsoDateInRange = (date: string, start: string, end: string) => {
  if (!date || !start || !end) return false;
  const d = date.slice(0, 10);
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  return d >= s && d <= e;
};

export const isoWeekEnd = (weekStart: string) => {
  const ws = String(weekStart || '').slice(0, 10);
  const d = new Date(`${ws}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return '';
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  return end.toISOString().slice(0, 10);
};

export const clampIsoDate = (date: string, min: string, max: string) => {
  const d = String(date || '').slice(0, 10);
  const a = String(min || '').slice(0, 10);
  const b = String(max || '').slice(0, 10);
  if (!d || !a || !b) return d;
  if (d < a) return a;
  if (d > b) return b;
  return d;
};

export const clampWeekEndToPeriod = (weekStart: string, periodEnd: string) => {
  const we = isoWeekEnd(weekStart);
  if (!we) return '';
  return clampIsoDate(we, we, periodEnd);
};

