// Cálculos astronómicos locales (sin conexión): salida/puesta del sol y fase lunar.
// Algoritmo solar de NOAA (precisión ~1 min); fase lunar por mes sinódico medio.
import { DAY, dayStart } from './time.js';

const rad = Math.PI / 180;

/**
 * Salida, puesta y mediodía solar para un día (clave YYYY-MM-DD, hora argentina).
 * Devuelve timestamps en ms, o null si el sol no sale/no se pone.
 */
export function sunTimes(key, lat, lon) {
  // Mediodía UTC aproximado del día local.
  const noonGuess = dayStart(key) + DAY / 2;
  const jd = noonGuess / DAY + 2440587.5;
  const T = (jd - 2451545) / 36525;

  const L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * rad) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eqTime =
    4 / rad *
    (y * Math.sin(2 * L0 * rad) -
      2 * e * Math.sin(M * rad) +
      4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
      0.5 * y * y * Math.sin(4 * L0 * rad) -
      1.25 * e * e * Math.sin(2 * M * rad)); // minutos

  const cosH = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  const [yy, mm, dd] = key.split('-').map(Number);
  const utcMidnight = Date.UTC(yy, mm - 1, dd);
  const noonMin = 720 - 4 * lon - eqTime; // minutos UTC
  const noon = utcMidnight + noonMin * 60000;
  if (cosH > 1 || cosH < -1) return { sunrise: null, sunset: null, noon };
  const H = Math.acos(cosH) / rad; // grados
  return {
    sunrise: noon - 4 * H * 60000,
    sunset: noon + 4 * H * 60000,
    noon,
  };
}

const SYNODIC = 29.530588853;
// Luna nueva de referencia: 6 de enero de 2000, 18:14 UTC.
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);

const PHASES = [
  'Luna nueva',
  'Luna creciente',
  'Cuarto creciente',
  'Gibosa creciente',
  'Luna llena',
  'Gibosa menguante',
  'Cuarto menguante',
  'Luna menguante',
];

/**
 * Fase lunar en un instante.
 * age: 0..1 (0 = nueva, 0.5 = llena); illumination: 0..1; name: nombre de la fase.
 */
export function moonPhase(ms) {
  const days = (ms - NEW_MOON_REF) / DAY;
  const age = (((days / SYNODIC) % 1) + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * age)) / 2;
  const name = PHASES[Math.round(age * 8) % 8];
  return { age, illumination, name };
}

/** Mareas de sicigia (vivas) cerca de luna nueva/llena; de cuadratura (muertas) cerca de los cuartos. */
export function tideKind(age) {
  const d = Math.min(age % 0.5, 0.5 - (age % 0.5)); // distancia a nueva/llena, 0..0.25
  if (d < 0.07) return 'Mareas vivas (sicigia)';
  if (d > 0.18) return 'Mareas muertas (cuadratura)';
  return null;
}
