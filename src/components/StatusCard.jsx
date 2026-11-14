import { tideState } from '../lib/tides.js';
import { sunTimes } from '../lib/astro.js';
import { dayKey, fmtDuration, fmtTime } from '../lib/time.js';
import { ArrowDown, ArrowUp, Sunrise, Sunset } from './icons.jsx';

/** Estado actual de la marea (arriba de todo). */
export default function StatusCard({ port, events, now }) {
  const state = events && tideState(events, now);
  const sun = sunTimes(dayKey(now), port.lat, port.lon);

  return (
    <section className="status">
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
