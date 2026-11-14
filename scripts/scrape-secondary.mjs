// Descarga la Tabla de Puertos Secundarios del SHN y genera scripts/out/secondary.json
// Uso: node scripts/scrape-secondary.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BASE, ROOT, fetchCached, text, cells, dmToDeg, hmToMinutes, num } from './shn.mjs';

const form = await fetchCached(BASE + 'Form_TMareas.asp?op=3');
const select = form.match(/<select[^>]*NAME="Psec"[\s\S]*?<\/select>/i)[0];
// Las <option> no tienen value: el navegador envía el texto con espacios colapsados.
const names = [...select.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/gi)].map((m) => text(m[1]));

// Nombres propios de la app (el SHN se consulta siempre con el nombre original).
const RENAMES = {
  'RINCÓN DE BAHÍA BLANCA - PUERTO CUATREROS (Muelle)': 'RINCÓN DE BAHÍA BLANCA - PUERTO CUATREROS (Maldo)',
};

const ports = [];
for (const shnName of names) {
  const html = await fetchCached(BASE + 'R_TPSMareas.asp?Psec=' + encodeURIComponent(shnName));
  const name = RENAMES[shnName] ?? shnName;
  const patron = text(html.match(/Puerto Patr[^:]*:([\s\S]*?)<\//i)[1]);
  // Última fila de la tabla = valores numéricos.
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => cells(m[1])).filter((r) => r.length >= 10);
  const v = rows.at(-1);
  if (!v) throw new Error('Sin datos para ' + name);
  const [lat, lon, hPm, hBm, aPm, aBm, est, nivel, bajante, amplitud] = v;
  // Prefijo "s": corrección válida sólo para pleamares de sicigia.
  const springOnly = /^s/.test(hPm.trim());
  ports.push({
    name,
    patron,
    lat: dmToDeg(lat),
    lon: dmToDeg(lon),
    springOnly,
    dtPm: hmToMinutes(hPm.replace(/^s/, '')),
    dtBm: hmToMinutes(hBm),
    dhPm: num(aPm),
    dhBm: num(aBm),
    est: hmToMinutes(est),
    meanLevel: num(nivel),
    ebbDuration: hmToMinutes(bajante),
    meanRange: num(amplitud),
  });
  console.log(`${name} -> ${patron} | ${v.join(' | ')}`);
}

await mkdir(path.join(ROOT, 'scripts', 'out'), { recursive: true });
await writeFile(path.join(ROOT, 'scripts', 'out', 'secondary.json'), JSON.stringify(ports, null, 2));
console.log(`\n${ports.length} puertos secundarios.`);
