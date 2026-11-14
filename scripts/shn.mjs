// Utilidades compartidas para descargar y parsear las páginas del SHN (hidro.gov.ar).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'https://www.hidro.gov.ar/oceanografia/Tmareas/';
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Descarga con caché en disco para no castigar al servidor al re-ejecutar. */
export async function fetchCached(url, { method = 'GET', body } = {}) {
  const key = createHash('sha1').update(method + url + (body ?? '')).digest('hex');
  const file = path.join(CACHE_DIR, key + '.html');
  try {
    return await readFile(file, 'utf8');
  } catch {}
  await mkdir(CACHE_DIR, { recursive: true });
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await writeFile(file, text);
      await sleep(300);
      return text;
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url} ${body ?? ''}: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

const ENTITIES = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', ordm: 'º', deg: '°', nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>' };

export function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&(\w+);/g, (m, e) => ENTITIES[e] ?? m);
}

/** Texto plano de un fragmento HTML, con espacios colapsados. */
export function text(html) {
  return decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Celdas <td> de un fragmento HTML como texto plano. */
export function cells(html) {
  return [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => text(m[1]));
}

/** "42 35" (grados minutos) -> grados decimales negativos (Sur / Oeste). */
export function dmToDeg(s, negative = true) {
  const [d, m] = s.trim().split(/\s+/).map(Number);
  const v = d + (m || 0) / 60;
  return +(negative ? -v : v).toFixed(4);
}

/** "-0 15" / "+1 05" / "0 00" -> minutos con signo; "- --" -> null. */
export function hmToMinutes(s) {
  const m = s.trim().match(/^([-+]?)(\d+)\s+(\d+)$/);
  if (!m) return null;
  const v = +m[2] * 60 + +m[3];
  return m[1] === '-' ? -v : v;
}

/** "-0,06" -> -0.06 ; "-0 09" -> -0.09 (errata del SHN) ; "- --" -> null */
export function num(s) {
  const t = (s ?? '').trim().replace(/^([-+]?\d+)\s+(\d+)$/, '$1.$2').replace(',', '.');
  return /^[-+]?\d+(\.\d+)?$/.test(t) ? +t : null;
}

/** Normaliza para comparar nombres: sin acentos, mayúsculas, sin puntuación. */
export function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

/** "PUERTO SAN JULIÁN (Punta Peña)" -> "Puerto San Julián (Punta Peña)" */
export function titleCase(s) {
  const small = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'a']);
  return s
    .toLowerCase()
    .replace(/(^|[\s(\-/])(\p{L})(\p{L}*)/gu, (m, sep, first, rest, offset) =>
      offset > 0 && small.has(first + rest) ? m : sep + first.toUpperCase() + rest,
    );
}
