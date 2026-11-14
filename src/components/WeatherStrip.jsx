import { HOUR } from '../lib/time.js';
import { SKY_LABELS, cardinal, skyKind, windColor } from '../lib/weather.js';
import { CHART_PAD, CHART_W } from './TideChart.jsx';
import { Sky } from './icons.jsx';

const BLOCK = 3; // horas por columna

/**
 * Cielo, viento, temperatura y lluvia en bloques de 3 h, alineados con el eje del gráfico de marea.
 */
export default function WeatherStrip({ hours, start, sun }) {
  const blocks = [];
  for (let b = 0; b < 24 / BLOCK; b++) {
    const from = start + b * BLOCK * HOUR;
    const hs = hours.filter((h) => h.t >= from && h.t < from + BLOCK * HOUR);
    if (!hs.length) {
      blocks.push(null);
      continue;
    }
    // Viento: la hora más ventosa del bloque (coincide con el máximo del resumen del día).
    const windiest = hs.reduce((a, h) => (h.wind > a.wind ? h : a));
    const mid = hs[Math.floor(hs.length / 2)];
    const midT = from + (BLOCK / 2) * HOUR;
    blocks.push({
      sky: skyKind(hs),
      night: sun.sunrise ? midT < sun.sunrise || midT > sun.sunset : false,
      wind: Math.round(windiest.wind),
      gust: Math.round(Math.max(...hs.map((h) => h.gust))),
      dir: windiest.dir,
      temp: Math.round(mid.temp),
      rain: hs.reduce((s, h) => s + (h.rain || 0), 0),
    });
  }

  // Márgenes en % para coincidir con el área de dibujo del SVG.
  const style = {
    marginLeft: `${(CHART_PAD.l / CHART_W) * 100}%`,
    marginRight: `${(CHART_PAD.r / CHART_W) * 100}%`,
    gridTemplateColumns: `repeat(${blocks.length}, 1fr)`,
  };

  return (
    <div className="wx">
      <div className="wx-labels" aria-hidden="true">
        <span />
        <span>km/h</span>
        <span>ráf.</span>
        <span>°C</span>
        <span>mm</span>
      </div>
      <div className="wx-grid" style={style}>
        {blocks.map((b, i) =>
          b ? (
            <div
              key={i}
              className="wx-col"
              title={`${SKY_LABELS[b.sky]} · ${b.wind} km/h del ${cardinal(b.dir)}, ráfagas ${b.gust} km/h`}
            >
              <span className="wx-sky">
                <Sky kind={b.sky} night={b.night} />
              </span>
              <span className="wx-wind" style={{ background: windColor(b.wind) }}>
                <svg viewBox="0 0 24 24" width="14" height="14" style={{ transform: `rotate(${b.dir + 180}deg)` }}>
                  <path d="M12 3l5 9h-3.5v9h-3v-9H7z" fill="currentColor" />
                </svg>
                {b.wind}
              </span>
              <span className="wx-gust">{b.gust}</span>
              <span className="wx-temp">{b.temp}°</span>
              <span className={`wx-rain${b.rain >= 0.1 ? ' wet' : ''}`}>{b.rain >= 0.1 ? b.rain.toFixed(1) : '·'}</span>
            </div>
          ) : (
            <div key={i} className="wx-col" />
          ),
        )}
      </div>
    </div>
  );
}
