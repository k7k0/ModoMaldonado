// Pronóstico horario de Open-Meteo (gratuito, sin clave, CC BY 4.0).
// Es lo único que la app consulta online: si no hay conexión se usa el último guardado.
import { HOUR, dayKey } from './time.js';

const API = 'https://api.open-meteo.com/v1/forecast';
const FRESH_MS = HOUR; // no se vuelve a consultar antes de esto
const MAX_AGE_MS = 3 * 24 * HOUR; // un pronóstico más viejo no se muestra
const TIMEOUT_MS = 8000; // con mala señal no se espera más que esto

export const ATTRIBUTION = { name: 'Open-Meteo', url: 'https://open-meteo.com/' };

/** Spots de Windguru por puerto (id de la URL windguru.cz/<id>). */
const WINDGURU_SPOTS = {
  'S-RINCON-DE-BAHIA-BLANCA-PUERTO-CUATREROS-MALDO': 329647,
  'S-RINCON-DE-BAHIA-BLANCA-PUERTO-GALVAN': 329647,
  IWHI: 329647,
};

export function windguruUrl(port) {
  const spot = WINDGURU_SPOTS[port.id];
  return spot ? `https://www.windguru.cz/${spot}` : 'https://www.windguru.cz/';
}

const cacheKey = (lat, lon) => `mm.wx.${lat.toFixed(2)},${lon.toFixed(2)}`;

function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/**
 * Pronóstico para una posición: { fetchedAt, hours: [{ t, temp, rain, rainProb, wind, gust, dir }] }
 * Devuelve el guardado si es reciente; si falla la red, el guardado aunque sea viejo (o null).
 */
export async function loadForecast(lat, lon) {
  const key = cacheKey(lat, lon);
  const cached = readCache(key);
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached;
  const fallback = cached && Date.now() - cached.fetchedAt < MAX_AGE_MS ? cached : null;
  // Sin conexión ni se intenta: las mareas no dependen de esto.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return fallback;

  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    hourly: 'temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kmh',
    timeformat: 'unixtime',
    forecast_days: '16',
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}?${params}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const h = (await res.json()).hourly;
    const forecast = {
      fetchedAt: Date.now(),
      hours: h.time.map((s, i) => ({
        t: s * 1000,
        temp: h.temperature_2m[i],
        rain: h.precipitation[i],
        rainProb: h.precipitation_probability[i],
        wind: h.wind_speed_10m[i],
        gust: h.wind_gusts_10m[i],
        dir: h.wind_direction_10m[i],
      })),
    };
    writeCache(key, forecast);
    return forecast;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Horas del pronóstico agrupadas por día (hora argentina). */
export function forecastByDay(forecast) {
  const map = new Map();
  for (const h of forecast?.hours ?? []) {
    if (h.wind == null) continue;
    const k = dayKey(h.t);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(h);
  }
  return map;
}

/** Resumen diario: viento máx., ráfaga máx., temp. mín/máx., lluvia total y prob. máx. */
export function daySummary(hours) {
  if (!hours?.length) return null;
  const max = (f) => Math.max(...hours.map(f));
  const min = (f) => Math.min(...hours.map(f));
  return {
    windMax: max((h) => h.wind),
    gustMax: max((h) => h.gust),
    tempMin: min((h) => h.temp),
    tempMax: max((h) => h.temp),
    rain: hours.reduce((s, h) => s + (h.rain || 0), 0),
    rainProb: max((h) => h.rainProb ?? 0),
  };
}

/** Viento pronosticado (km/h) en el instante t: la hora más cercana, si está a menos de 90 min. */
export function windAt(hours, t) {
  let best = null;
  for (const h of hours ?? []) if (!best || Math.abs(h.t - t) < Math.abs(best.t - t)) best = h;
  return best && Math.abs(best.t - t) <= 90 * 60000 ? best.wind : null;
}

/** Oleaje del ícono según el viento: planchado < 10 km/h, lineal hasta el máximo en 50 km/h. */
export function chopFromWind(kmh) {
  if (kmh == null) return null;
  return Math.max(0, Math.min(1, (kmh - 10) / 40));
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
/** Dirección de donde viene el viento: 225 -> "SO". */
export const cardinal = (deg) => CARDINALS[Math.round(deg / 45) % 8];

/** Escala de color de viento (km/h), estilo Windguru. */
export function windColor(kmh) {
  if (kmh < 8) return 'var(--wind-0)';
  if (kmh < 16) return 'var(--wind-1)';
  if (kmh < 25) return 'var(--wind-2)';
  if (kmh < 35) return 'var(--wind-3)';
  if (kmh < 45) return 'var(--wind-4)';
  return 'var(--wind-5)';
}
