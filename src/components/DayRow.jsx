import { memo, useMemo } from 'react';
import { moonPhase, sunTimes, tideKind } from '../lib/astro.js';
import { dayRange } from '../lib/tides.js';
import { DAY, HOUR, MONTHS, WEEKDAYS, WEEKDAYS_LONG, arParts, dayStart, fmtTime } from '../lib/time.js';
import {
  ATTRIBUTION,
  SKY_LABELS,
  chopFromWind,
  daySummary,
  skyKind,
  windAt,
  windColor,
  windguruUrl,
} from '../lib/weather.js';
import { ChevronDown, Drop, Moon, Sky, Sunrise, Sunset, Thermo, TideLevel, Wind } from './icons.jsx';
import TideChart from './TideChart.jsx';
import WeatherStrip from './WeatherStrip.jsx';
import PortInfo from './PortInfo.jsx';

/** Fila de un día: mareas resumidas; al tocarla muestra el detalle. */
function DayRow({ dayKey, label, dayEvents, events, levelOf, wxHours, wxFetchedAt, port, open, onToggle, now }) {
  const start = dayStart(dayKey);
  const p = arParts(start);
  const moon = moonPhase(start + 12 * HOUR);
  const isToday = now >= start && now < start + DAY;
  const wx = daySummary(wxHours);
  // Cielo del día: sólo las horas con sol.
  const sky = useMemo(() => {
    if (!wxHours?.length) return null;
    const sun = sunTimes(dayKey, port.lat, port.lon);
    const daylight = sun.sunrise ? wxHours.filter((h) => h.t >= sun.sunrise && h.t <= sun.sunset) : wxHours;
    return skyKind(daylight.length ? daylight : wxHours);
  }, [wxHours, dayKey, port]);

  return (
    <article className={`day${isToday ? ' today' : ''}${open ? ' open' : ''}`}>
      <button
        className="day-summary"
        onClick={() => onToggle(dayKey)}
        aria-expanded={open}
        title={open ? 'Ocultar detalle' : 'Ver detalle del día'}
      >
        <div className="day-date">
          <span className="day-wd">{label ?? WEEKDAYS[p.wd]}</span>
          <span className="day-num">{p.d}</span>
          <span className="day-month">{p.m}</span>
          <Moon age={moon.age} size={22} />
        </div>
        <div className="day-main">
          <div className="day-tides">
            {dayEvents.length ? (
              dayEvents.map((e) => {
                const wind = windAt(wxHours, e.t);
                return (
                  <div
                    key={e.t}
                    className={`tide ${e.high ? 'hi' : 'lo'}`}
                    title={`${e.high ? 'Pleamar' : 'Bajamar'} de ${e.h.toFixed(2)} m${wind != null ? ` · viento ${Math.round(wind)} km/h` : ''}`}
                  >
                    <TideLevel level={levelOf(e)} chop={chopFromWind(wind)} />
                    <span className="tide-time">{fmtTime(e.t)}</span>
                    <span className="tide-h">{e.h.toFixed(2)}m</span>
                  </div>
                );
              })
            ) : (
              <span className="muted">Sin datos</span>
            )}
          </div>
          {wx && <WeatherSummary wx={wx} sky={sky} />}
        </div>
        <ChevronDown className="day-chevron" />
      </button>
      {open && <DayDetail {...{ dayKey, start, p, moon, dayEvents, events, wxHours, wxFetchedAt, port, now }} />}
    </article>
  );
}

const round = (v) => (v == null ? '–' : Math.round(v));

/** Línea compacta de pronóstico: viento máx. (ráfaga), cielo y temperatura mín/máx, lluvia. */
function WeatherSummary({ wx, sky }) {
  return (
    <div className="day-wx">
      <span title="Viento máximo y ráfaga máxima del día">
        <Wind />
        <b style={{ background: windColor(wx.windMax) }} className="wx-dot" />
        {Math.round(wx.windMax)} km/h
        <small>ráf. {round(wx.gustMax)}</small>
      </span>
      <span title={sky ? SKY_LABELS[sky] : undefined}>
        {sky ? <Sky kind={sky} size={18} /> : <Thermo />}
        {round(wx.tempMin)}° / {round(wx.tempMax)}°
      </span>
      <span className={wx.rain >= 0.1 ? 'wet' : 'dry'}>
        <Drop />
        {wx.rain >= 0.1 ? `${wx.rain < 10 ? wx.rain.toFixed(1) : Math.round(wx.rain)} mm` : 'sin lluvia'}
      </span>
    </div>
  );
}

function fmtAgo(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

function DayDetail({ dayKey, start, p, moon, dayEvents, events, wxHours, wxFetchedAt, port, now }) {
  const sun = sunTimes(dayKey, port.lat, port.lon);
  const range = dayRange(dayEvents);
  const kind = tideKind(moon.age);

  return (
    <div className="detail">
      <h3 className="detail-title">
        {WEEKDAYS_LONG[p.wd]} {p.d} de {MONTHS[p.m - 1]} de {p.y}
      </h3>

      <TideChart {...{ events, dayEvents, start, sun, now }} />
      {wxHours?.length ? (
        <>
          <WeatherStrip hours={wxHours} start={start} sun={sun} />
          <p className="wx-source">
            Pronóstico{' '}
            <a href={ATTRIBUTION.url} target="_blank" rel="noopener noreferrer">
              {ATTRIBUTION.name}
            </a>
            {wxFetchedAt && ` · actualizado ${fmtAgo(Date.now() - wxFetchedAt)}`} ·{' '}
            <a href={windguruUrl(port)} target="_blank" rel="noopener noreferrer">
              Ver en Windguru ↗
            </a>
          </p>
        </>
      ) : null}

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
