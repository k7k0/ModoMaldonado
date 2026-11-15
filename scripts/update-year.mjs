// Agrega un año nuevo de tablas del SHN de punta a punta y resume qué cambió.
// Uso: npm run data:year 2027
import { spawnSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './shn.mjs';

const YEAR = Number(process.argv[2]);
if (!Number.isInteger(YEAR) || YEAR < 2000) {
  console.error('Uso: npm run data:year <año>   (por ejemplo: npm run data:year 2027)');
  process.exit(1);
}

const CATALOG = path.join(ROOT, 'src', 'data', 'ports.json');
const readCatalog = async () => JSON.parse(await readFile(CATALOG, 'utf8'));

function run(script, ...args) {
  console.log(`\n▶ node scripts/${script} ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✖ Falló ${script}. No se tocaron los datos de la app si el error fue antes de build-data.`);
    process.exit(r.status ?? 1);
  }
}

const before = await readCatalog();

// ¿Ya lo publicó el SHN? (el formulario lista los años disponibles)
const form = await (await fetch('https://www.hidro.gov.ar/oceanografia/Tmareas/Form_Tmareas.asp')).text();
const offered = [...form.matchAll(/<option[^>]*value="(\d{4})"/g)].map((m) => +m[1]);
if (!offered.includes(YEAR)) {
  console.error(`El SHN todavía no publica ${YEAR}. Años disponibles: ${offered.join(', ')}.`);
  process.exit(1);
}

// La caché guarda el formulario y la tabla de secundarios del año anterior: hay que borrarla.
await rm(path.join(ROOT, 'scripts', '.cache'), { recursive: true, force: true });

run('scrape-secondary.mjs');
run('scrape-primary.mjs', String(YEAR));
run('build-data.mjs');

const after = await readCatalog();
const names = (c) => new Map(c.ports.map((p) => [p.id, `${p.name}${p.area ? ` (${p.area})` : ''}`]));
const [b, a] = [names(before), names(after)];
const added = [...a].filter(([id]) => !b.has(id)).map(([, n]) => n);
const removed = [...b].filter(([id]) => !a.has(id)).map(([, n]) => n);
const changedCorr = after.ports.filter((p) => {
  const old = before.ports.find((o) => o.id === p.id);
  return p.type === 'secondary' && old && JSON.stringify(old.corr) !== JSON.stringify(p.corr);
});

console.log(`\n✔ Años en la app: ${before.years.join(', ')} → ${after.years.join(', ')}`);
console.log(`  Puertos: ${before.ports.length} → ${after.ports.length}`);
if (added.length) console.log(`  Nuevos: ${added.join('; ')}`);
if (removed.length) console.log(`  Ya no publicados (desaparecen también de los años anteriores): ${removed.join('; ')}`);
if (changedCorr.length) console.log(`  Secundarios con correcciones distintas: ${changedCorr.map((p) => p.name).join('; ')}`);
console.log('\nRevisar con npm run dev y, si está bien:');
console.log(`  git add scripts/out public/data src/data && git commit -m "Tablas del SHN ${YEAR}"`);
