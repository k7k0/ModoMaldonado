// Descarga las Tablas de Marea de los puertos patrones del SHN para un año.
// Genera scripts/out/primary-<año>.json
// Uso: node scripts/scrape-primary.mjs 2026
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BASE, ROOT, fetchCached, text, cells, num } from './shn.mjs';

const YEAR = +(process.argv[2] ?? new Date().getFullYear());

const form = await fetchCached(BASE + 'Form_Tmareas.asp');
const select = form.match(/<select[^>]*name="Localidad"[\s\S]*?<\/select>/i)[0];
const localities = [...select.matchAll(/<option[^>]*value="(\w+)"[^>]*>([\s\S]*?)<\/option>/gi)].map((m) => ({
  code: m[1],
  name: text(m[2]),
}));

/** Descarga un mes. Devuelve el HTML del resultado. */
const fetchMonth = (code, year, month) =>
  fetchCached(BASE + 'RE_TablasDeMarea.asp', {
    method: 'POST',
    body: `FAnio=${year}&Localidad=${code}&FMes=${String(month).padStart(2, '0')}`,
  });

function parseHeader(html) {
  const t = text(html);
  const grab = (re) => t.match(re)?.[1]?.trim() ?? null;
  const lat = t.match(/Lat\.\s*(\d+)º\s*(\d+)'\s*S/);
  const lon = t.match(/Long\.\s*(\d+)º\s*(\d+)'\s*W/);
  // Tabla de alturas: Pleamar máx/media, Bajamar más baja/media, Amplitud máx/media.
  const stats = t.match(/Amplitud Pleamar Bajamar M\S+ Media M\S+ baja Media M\S+ Media ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+)/);
  return {
    lat: lat ? -(+lat[1] + lat[2] / 60).toFixed(4) : null,
    lon: lon ? -(+lon[1] + lon[2] / 60).toFixed(4) : null,
    charts: grab(/Carta\/s Argentina\/s:\s*(.*?)\s*Lat\./),
    tz: grab(/Huso Horario:\s*([+-]?\d+)/),
    regime: grab(/Régimen de marea:\s*(.*?)\s*Establecimiento/),
    est: grab(/Establecimiento de puerto medio:\s*(.*?)\s*Nivel medio/),
    meanLevel: num(grab(/Nivel medio:\s*([\d,]+)/)),
    stats: stats
      ? {
          hwMax: num(stats[1]),
          hwMean: num(stats[2]),
          lwMin: num(stats[3]),
          lwMean: num(stats[4]),
          rangeMax: num(stats[5]),
          rangeMean: num(stats[6]),
        }
      : null,
  };
}

/** Filas de predicción: [{ y, m, d, hh, mm, h }] */
function parseRows(html, year, month) {
  const start = html.search(/Predicciones de las Pleamares/i);
  if (start < 0) return [];
  const body = html.slice(start);
  const out = [];
  let day = null;
  for (const m of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const c = cells(m[1]);
    if (c.length < 3) continue;
    const d = c[0].match(/\d+/);
    if (d) day = +d[0];
    const time = c[1].match(/^(\d{1,2}):(\d{2})$/);
    const h = num(c[2]);
    if (!day || !time || h == null) continue;
    out.push({ y: year, m: month, d: day, hh: +time[1], mm: +time[2], h });
  }
  return out;
}

/** Marca cada evento como pleamar (1) o bajamar (0) comparando con sus vecinos. */
function classify(rows, label) {
  return rows.map((r, i) => {
    const prev = rows[i - 1]?.h;
    const next = rows[i + 1]?.h;
    const ref = prev != null && next != null ? (prev + next) / 2 : (prev ?? next);
    const high = r.h > ref ? 1 : 0;
    return { ...r, high };
  }).map((r, i, a) => {
    if (i > 0 && a[i - 1].high === r.high) console.warn(`  ! ${label}: dos ${r.high ? 'pleamares' : 'bajamares'} seguidas el ${r.d}/${r.m}/${r.y} ${r.hh}:${r.mm}`);
    return r;
  });
}

const result = { year: YEAR, source: BASE + 'Form_Tmareas.asp', scrapedAt: new Date().toISOString(), ports: [] };

for (const loc of localities) {
  process.stdout.write(`${loc.code} ${loc.name} `);
  let meta = null;
  let rows = [];
  // Diciembre del año anterior: permite calcular el estado de la marea el 1/1.
  try {
    rows.push(...parseRows(await fetchMonth(loc.code, YEAR - 1, 12), YEAR - 1, 12).slice(-8));
  } catch {}
  for (let month = 1; month <= 12; month++) {
    const html = await fetchMonth(loc.code, YEAR, month);
    meta ??= parseHeader(html);
    rows.push(...parseRows(html, YEAR, month));
    process.stdout.write('.');
  }
  const events = classify(rows, loc.code);
  console.log(` ${events.length} eventos`);
  if (!events.some((e) => e.y === YEAR)) {
    console.warn(`  ! ${loc.code}: sin datos para ${YEAR}, se omite`);
    continue;
  }
  result.ports.push({ ...loc, ...meta, events });
}

await mkdir(path.join(ROOT, 'scripts', 'out'), { recursive: true });
const file = path.join(ROOT, 'scripts', 'out', `primary-${YEAR}.json`);
await writeFile(file, JSON.stringify(result));
console.log(`\n${result.ports.length} puertos -> ${path.relative(ROOT, file)}`);
