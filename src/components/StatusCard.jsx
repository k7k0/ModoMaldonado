import { tideState } from '../lib/tides.js';
import { sunTimes } from '../lib/astro.js';
import { HOUR, dayKey, fmtDuration, fmtTime } from '../lib/time.js';
import { ArrowDown, ArrowUp, Sunrise, Sunset } from './icons.jsx';

const PHOTOS = {
  golden: { file: 'atardecer.webp', pos: 'center 62%' },
  day: { file: 'flamencos.webp', pos: 'center 36%' },
  night: { file: 'bigua.webp', pos: 'center 78%' },
};

/** Foto de fondo según el momento del día: atardecer/amanecer, día o noche. */
function photoFor(now, sun) {
  if (!sun.sunrise) return PHOTOS.day;
  const golden = 1.25 * HOUR;
  if (Math.abs(now - sun.sunrise) < golden || Math.abs(now - sun.sunset) < golden) return PHOTOS.golden;
  return now > sun.sunrise && now < sun.sunset ? PHOTOS.day : PHOTOS.night;
}

/** Estado actual de la marea (arriba de todo). */
export default function StatusCard({ port, events, now }) {
  const state = events && tideState(events, now);
  const sun = sunTimes(dayKey(now), port.lat, port.lon);
  const photo = photoFor(now, sun);

  return (
    <section className="status">
      <div
        className="status-photo"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}photos/${photo.file})`, backgroundPosition: photo.pos }}
      />
      {state ? (
        <div className="status-main">
          <div className="status-icon">{state.rising ? <ArrowUp /> : <ArrowDown />}</div>
          <div>
            <div className="status-title">
              {state.rising ? 'Subiendo' : 'Bajando'} hasta las {fmtTime(state.next.t)} hs
            </div>
            <div className="status-sub">
              {state.height.toFixed(2)} m ahora · {state.rising ? 'pleamar' : 'bajamar'} de {state.next.h.toFixed(2)} m en{' '}
              {fmtDuration(state.next.t - now)}
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
