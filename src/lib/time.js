// Las tablas del SHN están en hora oficial argentina (UTC-3, sin horario de verano).
// Todo se maneja como timestamp (ms) y se formatea siempre en UTC-3,
// independientemente de la zona horaria del dispositivo.

export const AR_OFFSET_MIN = -180;
const OFFSET_MS = AR_OFFSET_MIN * 60000;
export const MIN = 60000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Partes de fecha/hora en hora argentina. */
export function arParts(ms) {
  const d = new Date(ms + OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
    wd: d.getUTCDay(),
  };
}

/** Timestamp de una fecha/hora local argentina. */
export function arTime(y, m, d, hh = 0, mm = 0) {
  return Date.UTC(y, m - 1, d, hh, mm) - OFFSET_MS;
}

/** Clave de día "2026-11-14" en hora argentina. */
export function dayKey(ms) {
  const p = arParts(ms);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Inicio del día (00:00 AR) a partir de una clave "YYYY-MM-DD". */
export function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  return arTime(y, m, d);
}

export const addDays = (key, n) => dayKey(dayStart(key) + n * DAY + 12 * HOUR);

export const pad = (n) => String(n).padStart(2, '0');

export function fmtTime(ms) {
  const p = arParts(ms);
  return `${pad(p.hh)}:${pad(p.mm)}`;
}

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "en 2 h 10 min" */
export function fmtDuration(ms) {
  const total = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
