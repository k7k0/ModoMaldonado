import { tideState } from '../lib/tides.js';
import { sunTimes } from '../lib/astro.js';
import { HOUR, dayKey, fmtDuration, fmtTime } from '../lib/time.js';
import { ArrowDown, ArrowUp, Sunrise, Sunset } from './icons.jsx';

// Fotos de la tarjeta por situación. Dentro de cada grupo rota cada hora.
const PHOTOS = {
  golden: [{ file: 'atardecer.webp', pos: 'center 62%' }],
  night: [{ file: 'bigua.webp', pos: 'center 78%' }],
  lowTide: ['espartillar', 'kayaks-playa', 'banco-gaviotas'],
  cloudy: ['nubes-proa', 'muelle-viejo'],
  day: [{ file: 'flamencos.webp', pos: 'center 36%' }, 'proa-aves', 'maldo-calma', 'muelle-azul', 'kayak-y-barco'],
};
const photo = (p) => (typeof p === 'string' ? { file: `${p}.webp`, pos: 'center' } : p);

/**
 * Foto de fondo según el momento: atardecer/amanecer, noche, marea baja, cielo cubierto o día.
 * `wxNow` es la hora del pronóstico más cercana (puede faltar sin conexión).
 */
function photoFor(now, sun, state, wxNow) {
  const pick = (group) => photo(group[Math.floor(now / HOUR) % group.length]);
  if (sun.sunrise) {
    const golden = 1.25 * HOUR;
    if (Math.abs(now - sun.sunrise) < golden || Math.abs(now - sun.sunset) < golden) return pick(PHOTOS.golden);
    if (now < sun.sunrise || now > sun.sunset) return pick(PHOTOS.night);
  }
  if (state) {
    const low = Math.min(state.prev.h, state.next.h);
    const high = Math.max(state.prev.h, state.next.h);
    if ((state.height - low) / (high - low || 1) < 0.3) return pick(PHOTOS.lowTide);
  }
  if (wxNow && (wxNow.cloud >= 75 || wxNow.rain > 0)) return pick(PHOTOS.cloudy);
  return pick(PHOTOS.day);
}

/** Estado actual de la marea (arriba de todo). */
export default function StatusCard({ port, events, forecast, now }) {
  const state = events && tideState(events, now);
  const sun = sunTimes(dayKey(now), port.lat, port.lon);
  const wxNow = forecast?.hours.find((h) => Math.abs(h.t - now) <= HOUR / 2);
  const bg = photoFor(now, sun, state, wxNow);

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
