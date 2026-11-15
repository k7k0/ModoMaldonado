// Convierte lo descargado (scripts/out) en los datos que consume la app:
//   src/data/ports.json            -> catálogo de puertos (patrones + secundarios)
//   public/data/<año>/<COD>.json   -> pleamares/bajamares de cada puerto patrón
// Uso: node scripts/build-data.mjs            (procesa todos los primary-<año>.json)
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, norm, titleCase } from './shn.mjs';
import { DEFAULT_PORT, WINDGURU_SPOTS } from '../src/config.js';

const OUT = path.join(ROOT, 'scripts', 'out');

// Nombres de puerto patrón en la tabla de secundarios que no coinciden con la de patrones.
const PATRON_ALIASES = {
  [norm('Punta Quilla (Pto. Santa Cruz)')]: 'QUIL',
  // La tabla de secundarios refiere a Dársena F; la predicción publicada es Muelle de Pescadores.
  [norm('Puerto de Buenos Aires (Dársena F)')]: 'BSAS',
};

const years = (await readdir(OUT))
  .map((f) => f.match(/^primary-(\d{4})\.json$/)?.[1])
  .filter(Boolean)
  .map(Number)
  .sort();
if (!years.length) throw new Error('No hay scripts/out/primary-<año>.json. Ejecutá npm run data:scrape');

const secondary = JSON.parse(await readFile(path.join(OUT, 'secondary.json'), 'utf8'));
const latest = JSON.parse(await readFile(path.join(OUT, `primary-${years.at(-1)}.json`), 'utf8'));

/** "RINCÓN DE BAHÍA BLANCA - PUERTO GALVÁN" -> { name: "Puerto Galván", area: "Rincón de Bahía Blanca" } */
function splitName(raw) {
  const parts = raw.split(/\s+-\s+/);
  const name = titleCase(parts.pop());
  return { name, area: parts.length ? titleCase(parts.join(' - ')) : null };
}

const byName = new Map(latest.ports.map((p) => [norm(p.name), p.code]));
const byCode = new Map(latest.ports.map((p) => [p.code, p]));

const primaries = latest.ports.map((p) => {
  // Sin posición propia (canales calculados sobre otro puerto): se usa la del puerto base.
  const base = p.lat == null && p.basedOn ? byCode.get(byName.get(norm(p.basedOn))) : null;
  const lat = p.lat ?? base?.lat;
  const lon = p.lon ?? base?.lon;
  if (lat == null || lon == null) throw new Error(`${p.code} (${p.name}) sin posición`);
  return {
    id: p.code,
    ...splitName(p.name),
    type: 'primary',
    lat,
    lon,
    posFrom: base?.code ?? null,
    charts: p.charts,
    regime: p.regime,
    est: p.est,
    meanLevel: p.meanLevel,
    stats: p.stats,
  };
});

const secondaries = [];
const skipped = [];
for (const s of secondary) {
  const patron = PATRON_ALIASES[norm(s.patron)] ?? byName.get(norm(s.patron));
  if (!patron) {
    skipped.push(`${s.name} (patrón "${s.patron}" sin tabla)`);
    continue;
  }
  // Sólo hay corrección para pleamares de sicigia: no alcanza para predecir.
  if (s.springOnly || s.dtPm == null) {
    skipped.push(`${s.name} (sólo corrección de pleamar de sicigia)`);
    continue;
  }
  const approx = s.dtBm == null || s.dhPm == null || s.dhBm == null;
  secondaries.push({
    id: 'S-' + norm(s.name).replace(/ /g, '-'),
    ...splitName(s.name),
    type: 'secondary',
    lat: s.lat,
    lon: s.lon,
    patron,
    corr: {
      dtPm: s.dtPm,
      dtBm: s.dtBm ?? s.dtPm,
      dhPm: s.dhPm ?? 0,
      dhBm: s.dhBm ?? 0,
    },
    approx,
    est: s.est,
    meanLevel: s.meanLevel,
    ebbDuration: s.ebbDuration,
    meanRange: s.meanRange,
  });
}

const catalog = {
  years,
  generatedAt: new Date().toISOString(),
  ports: [...primaries, ...secondaries].sort((a, b) => a.name.localeCompare(b.name, 'es')),
};

// Los ids salen de los nombres del SHN: si un año cambia un nombre, el puerto por defecto o un
// spot de Windguru quedarían apuntando a la nada. Se frena antes de escribir nada.
const ids = new Set(catalog.ports.map((p) => p.id));
const missing = [DEFAULT_PORT, ...Object.keys(WINDGURU_SPOTS)].filter((id) => !ids.has(id));
if (missing.length) {
  throw new Error(
    `Puertos de src/config.js que no están en los datos: ${[...new Set(missing)].join(', ')}.\n` +
      'Revisar si el SHN cambió el nombre (RENAMES en scrape-secondary.mjs) y actualizar src/config.js.',
  );
}

await mkdir(path.join(ROOT, 'src', 'data'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'ports.json'), JSON.stringify(catalog));

// Tablas por año y puerto. Tiempo en minutos desde el 1/1 00:00 hora argentina (UTC-3),
// altura en cm y tipo ("P" pleamar / "B" bajamar) como string compacto.
const files = [];
for (const year of years) {
  const data = JSON.parse(await readFile(path.join(OUT, `primary-${year}.json`), 'utf8'));
  const dir = path.join(ROOT, 'public', 'data', String(year));
  await mkdir(dir, { recursive: true });
  const base = Date.UTC(year, 0, 1);
  for (const p of data.ports) {
    const t = [];
    const h = [];
    let k = '';
    for (const e of p.events) {
      t.push(Math.round((Date.UTC(e.y, e.m - 1, e.d, e.hh, e.mm) - base) / 60000));
      h.push(Math.round(e.h * 100));
      k += e.high ? 'P' : 'B';
    }
    await writeFile(path.join(dir, `${p.code}.json`), JSON.stringify({ id: p.code, year, t, h, k }));
    files.push(`data/${year}/${p.code}.json`);
  }
  console.log(`${year}: ${data.ports.length} tablas`);
}

// Lista para que el service worker precargue todas las tablas (uso sin conexión).
await writeFile(path.join(ROOT, 'public', 'data', 'files.json'), JSON.stringify(files));

console.log(`${primaries.length} patrones + ${secondaries.length} secundarios`);
if (skipped.length) console.log('Omitidos:\n  ' + skipped.join('\n  '));
