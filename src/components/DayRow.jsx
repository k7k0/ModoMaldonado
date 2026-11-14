import { memo } from 'react';
import { moonPhase, sunTimes, tideKind } from '../lib/astro.js';
import { dayRange } from '../lib/tides.js';
import { DAY, HOUR, MONTHS, WEEKDAYS, WEEKDAYS_LONG, arParts, dayStart, fmtTime } from '../lib/time.js';
import { Moon, Sunrise, Sunset, Waves } from './icons.jsx';
import TideChart from './TideChart.jsx';
import PortInfo from './PortInfo.jsx';

/** Fila de un día: mareas resumidas; al tocarla muestra el detalle. */
function DayRow({ dayKey, label, dayEvents, events, port, open, onToggle, now }) {
  const start = dayStart(dayKey);
  const p = arParts(start);
  const moon = moonPhase(start + 12 * HOUR);
  const isToday = now >= start && now < start + DAY;

  return (
    <article className={`day${isToday ? ' today' : ''}${open ? ' open' : ''}`}>
      <button className="day-summary" onClick={() => onToggle(dayKey)} aria-expanded={open}>
        <div className="day-date">
          <span className="day-wd">{label ?? WEEKDAYS[p.wd]}</span>
          <span className="day-num">{p.d}</span>
          <span className="day-month">{p.m}</span>
          <Moon age={moon.age} size={22} />
        </div>
        <div className="day-tides">
          {dayEvents.length ? (
            dayEvents.map((e) => (
              <div key={e.t} className={`tide ${e.high ? 'hi' : 'lo'}`}>
                <Waves high={e.high} />
                <span className="tide-time">{fmtTime(e.t)}</span>
                <span className="tide-h">{e.h.toFixed(2)}m</span>
              </div>
            ))
          ) : (
            <span className="muted">Sin datos</span>
          )}
        </div>
      </button>
      {open && <DayDetail {...{ dayKey, start, p, moon, dayEvents, events, port, now }} />}
    </article>
  );
}

function DayDetail({ dayKey, start, p, moon, dayEvents, events, port, now }) {
  const sun = sunTimes(dayKey, port.lat, port.lon);
  const range = dayRange(dayEvents);
  const kind = tideKind(moon.age);

  return (
    <div className="detail">
      <h3 className="detail-title">
        {WEEKDAYS_LONG[p.wd]} {p.d} de {MONTHS[p.m - 1]} de {p.y}
      </h3>

      <TideChart {...{ events, dayEvents, start, sun, now }} />

      <table className="detail-table">
        <thead>
          <tr>
            <th>Marea</th>
            <th>Hora</th>
            <th>Altura</th>
          </tr>
        </thead>
        <tbody>
          {dayEvents.map((e) => (
            <tr key={e.t}>
              <td>{e.high ? 'Pleamar' : 'Bajamar'}</td>
              <td>{fmtTime(e.t)} hs</td>
              <td>{e.h.toFixed(2)} m</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="facts">
        {range != null && <Fact k="Amplitud del día" v={`${range.toFixed(2)} m`} />}
        <Fact
          k="Sol"
          v={
            <span className="inline-icons">
              <Sunrise /> {sun.sunrise ? fmtTime(sun.sunrise) : '—'} <Sunset /> {sun.sunset ? fmtTime(sun.sunset) : '—'}
            </span>
          }
        />
        <Fact
          k="Luna"
          v={
            <span className="inline-icons">
              <Moon age={moon.age} size={18} /> {moon.name} · {Math.round(moon.illumination * 100)}%
            </span>
          }
        />
        {kind && <Fact k="Tipo de marea" v={kind} />}
      </dl>

      <PortInfo port={port} />
    </div>
  );
}

const Fact = ({ k, v }) => (
  <div className="fact">
    <dt>{k}</dt>
    <dd>{v}</dd>
  </div>
);

export default memo(DayRow);
