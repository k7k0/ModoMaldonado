// Carga de tablas, corrección de puertos secundarios e interpolación de alturas.
import catalog from '../data/ports.json';
import { DAY, MIN, dayKey, dayStart } from './time.js';

export const ports = catalog.ports;
export const years = catalog.years;
export const portById = new Map(ports.map((p) => [p.id, p]));

/** Rango de días con datos (claves YYYY-MM-DD). */
export const dataRange = {
  first: `${years[0]}-01-01`,
  last: `${years.at(-1)}-12-31`,
};

const tableCache = new Map();

/** Tabla de un puerto patrón para un año: [{ t (ms), h (m), high (bool) }]. */
function loadTable(id, year) {
  const key = `${year}/${id}`;
  if (!tableCache.has(key)) {
    const url = `${import.meta.env.BASE_URL}data/${year}/${id}.json`;
    tableCache.set(
      key,
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((raw) => {
          if (!raw) return [];
          const base = dayStart(`${year}-01-01`);
          return raw.t.map((t, i) => ({ t: base + t * MIN, h: raw.h[i] / 100, high: raw.k[i] === 'P' }));
        })
        .catch(() => []),
    );
  }
  return tableCache.get(key);
}

/**
 * Pleamares y bajamares del puerto (patrón o secundario) para todos los años disponibles,
 * ordenadas por tiempo. Para un secundario se aplican las correcciones de hora y altura
 * de la Tabla de Puertos Secundarios del SHN sobre las del puerto patrón.
 */
export async function loadEvents(port) {
  const patronId = port.type === 'secondary' ? port.patron : port.id;
  const tables = await Promise.all(years.map((y) => loadTable(patronId, y)));
  const seen = new Set();
  let events = tables.flat().filter((e) => !seen.has(e.t) && seen.add(e.t));
  if (port.type === 'secondary') {
    const c = port.corr;
    events = events.map((e) => ({
      t: e.t + (e.high ? c.dtPm : c.dtBm) * MIN,
      h: round2(e.h + (e.high ? c.dhPm : c.dhBm)),
      high: e.high,
    }));
  }
  return events.sort((a, b) => a.t - b.t);
}

const round2 = (x) => Math.round(x * 100) / 100;

/** Agrupa eventos por día (hora argentina): Map<YYYY-MM-DD, evento[]>. */
export function groupByDay(events) {
  const map = new Map();
  for (const e of events) {
    const k = dayKey(e.t);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(e);
  }
  return map;
}

/** Índice del primer evento posterior a t (búsqueda binaria). */
function nextIndex(events, t) {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].t <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Altura estimada en el instante t: interpolación cosenoidal entre la marea anterior y
 * la siguiente (mismo criterio que la Tabla de Interpolación del SHN). null si no hay datos.
 */
export function heightAt(events, t) {
  const i = nextIndex(events, t);
  const a = events[i - 1];
  const b = events[i];
  if (!a || !b) return null;
  const f = (t - a.t) / (b.t - a.t);
  return a.h + (b.h - a.h) * (1 - Math.cos(Math.PI * f)) / 2;
}

/** Estado de la marea en t: subiendo/bajando, próxima marea y altura actual. */
export function tideState(events, t) {
  const i = nextIndex(events, t);
  const prev = events[i - 1];
  const next = events[i];
  if (!prev || !next) return null;
  return {
    rising: next.high,
    prev,
    next,
    height: heightAt(events, t),
    progress: (t - prev.t) / (next.t - prev.t),
  };
}

/** Puntos de la curva [t, h] entre dos instantes, cada `step` ms. */
export function curve(events, from, to, step = 10 * MIN) {
  const pts = [];
  for (let t = from; t <= to; t += step) {
    const h = heightAt(events, t);
    if (h != null) pts.push([t, h]);
  }
  return pts;
}

/** Amplitud del día: diferencia entre la mayor pleamar y la menor bajamar. */
export function dayRange(dayEvents) {
  const highs = dayEvents.filter((e) => e.high).map((e) => e.h);
  const lows = dayEvents.filter((e) => !e.high).map((e) => e.h);
  if (!highs.length || !lows.length) return null;
  return Math.max(...highs) - Math.min(...lows);
}

export { DAY };
