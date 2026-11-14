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

const cacheKey = (lat, lon) => `mm.wx4.${lat.toFixed(2)},${lon.toFixed(2)}`;

// Viento, ráfagas y temperatura de GFS: el modelo que Windguru muestra por defecto
// (la mezcla por defecto de Open-Meteo da ráfagas mucho más altas).
const MAIN_MODEL = 'gfs_seamless';
// La lluvia varía mucho entre modelos: se usa la mediana de estos tres (llueve si coinciden
// al menos dos; con dos modelos, el menor) y se ignoran trazas por hora.
const RAIN_MODELS = ['gfs_seamless', 'ecmwf_ifs025', 'icon_seamless'];
const RAIN_MIN_MM = 0.2;
const rainOrZero = (mm) => (mm != null && mm >= RAIN_MIN_MM ? mm : 0);

function medianLow(values) {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
}

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
 * Pronóstico para una posición: { fetchedAt, hours: [{ t, temp, rain, cloud, wind, gust, dir }] }
 * Devuelve el guardado si es reciente; si falla la red, el guardado aunque sea viejo (o null).
 */
export async function loadForecast(lat, lon) {
  const key = cacheKey(lat, lon);
  const cached = readCache(key);
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached;
  const fallback = cached && Date.now() - cached.fetchedAt < MAX_AGE_MS ? cached : null;
  // Sin conexión ni se intenta: las mareas no dependen de esto.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return fallback;

  const base = {
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    timeformat: 'unixtime',
    forecast_days: '16',
  };
  const main = new URLSearchParams({
    ...base,
    hourly: 'temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kmh',
    models: MAIN_MODEL,
  });
  const rainParams = new URLSearchParams({ ...base, hourly: 'precipitation', models: RAIN_MODELS.join(',') });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const get = (q) =>
    fetch(`${API}?${q}`, { signal: ctrl.signal }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  try {
    const [m, r] = await Promise.all([get(main), get(rainParams).catch(() => null)]);
    const h = m.hourly;
    const rainByTime = new Map(
      r?.hourly.time.map((t, i) => [t, medianLow(RAIN_MODELS.map((mod) => r.hourly[`precipitation_${mod}`]?.[i]))]) ??
        [],
    );
    const forecast = {
      fetchedAt: Date.now(),
      hours: h.time.map((s, i) => ({
        t: s * 1000,
        temp: h.temperature_2m[i],
        rain: rainOrZero(rainByTime.get(s) ?? h.precipitation[i]),
        cloud: h.cloud_cover[i],
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

/** Resumen diario: viento máx., ráfaga máx., temp. mín/máx. y lluvia total. */
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

/**
 * Estado del cielo para un conjunto de horas: lluvia (mm en el período) y nubosidad media (%).
 * 'clear' | 'partly' | 'cloudy' | 'overcast' | 'rain' | 'heavy'
 */
export function skyKind(hours) {
  if (!hours?.length) return null;
  const rain = hours.reduce((s, h) => s + (h.rain || 0), 0);
  const perHour = rain / hours.length;
  if (perHour >= 1.5) return 'heavy';
  if (rain >= RAIN_MIN_MM) return 'rain';
  const cloud = hours.reduce((s, h) => s + (h.cloud ?? 0), 0) / hours.length;
  if (cloud < 20) return 'clear';
  if (cloud < 55) return 'partly';
  if (cloud < 85) return 'cloudy';
  return 'overcast';
}

export const SKY_LABELS = {
  clear: 'Despejado',
  partly: 'Algo nublado',
  cloudy: 'Mayormente nublado',
  overcast: 'Cubierto',
  rain: 'Lluvia',
  heavy: 'Lluvia fuerte',
};

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
