import { tideState } from '../lib/tides.js';
import { sunTimes } from '../lib/astro.js';
import { arParts, dayKey, fmtDuration, fmtTime } from '../lib/time.js';
import { ArrowDown, ArrowUp, Sunrise, Sunset } from './icons.jsx';

// Una foto fija por cada franja de 2 horas del día (hora argentina): índice = hora / 2.
const PHOTOS = [
  { file: 'bigua.webp', pos: 'center 78%' }, // 00-02
  'muelle-viejo', // 02-04
  'maldo-calma', // 04-06
  'flamencos-proa', // 06-08
  'kayak-y-barco', // 08-10
  { file: 'flamencos.webp', pos: 'center 36%' }, // 10-12
  'banco-gaviotas', // 12-14
  'kayaks-playa', // 14-16
  'espartillar', // 16-18
  'proa-aves', // 18-20
  { file: 'atardecer.webp', pos: 'center 62%' }, // 20-22
  'gaviotas-vuelo', // 22-24
].map((p) => (typeof p === 'string' ? { file: `${p}.webp`, pos: 'center' } : p));

const photoFor = (now) => PHOTOS[Math.floor(arParts(now).hh / 2)];

/** Estado actual de la marea (arriba de todo). */
export default function StatusCard({ port, events, now }) {
  const state = events && tideState(events, now);
  const sun = sunTimes(dayKey(now), port.lat, port.lon);
  const bg = photoFor(now);

  return (
    <section className="status">
      <div
        className="status-photo"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}photos/${bg.file})`, backgroundPosition: bg.pos }}
      />
      {state ? (
        <div className="status-main">
          <div className="status-icon">{state.rising ? <ArrowUp /> : <ArrowDown />}</div>
          <div>
            <div className="status-title">
              {state.rising ? 'Subiendo' : 'Bajando'} hasta las {fmtTime(state.next.t)} hs
            </div>
            <div className="status-sub">
              {state.height.toFixed(2)} m ahora · {state.rising ? 'pleamar' : 'bajamar'} de {state.next.h.toFixed(2)} m
              en {fmtDuration(state.next.t - now)}
            </div>
          </div>
        </div>
      ) : (
        <div className="status-main">
          <div className="status-title">{events ? 'Sin datos de marea para hoy' : 'Cargando…'}</div>
        </div>
      )}
      {state && (
        <div className="status-bar" aria-hidden="true">
          <div style={{ width: `${state.progress * 100}%` }} />
        </div>
      )}
      <div className="status-sun">
        <span className="sun-chip">
          <Sunrise />
          {sun.sunrise ? fmtTime(sun.sunrise) : '—'}
        </span>
        <span className="sun-chip">
          <Sunset />
          {sun.sunset ? fmtTime(sun.sunset) : '—'}
        </span>
      </div>
    </section>
  );
}
