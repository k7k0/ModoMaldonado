import { curve } from '../lib/tides.js';
import { DAY, HOUR, fmtTime } from '../lib/time.js';

export const CHART_W = 340;
export const CHART_PAD = { l: 30, r: 8, t: 18, b: 22 };
const W = CHART_W;
const H = 150;
const PAD = CHART_PAD;

/** Curva de marea de un día (00 a 24 h), con noche sombreada y marcador de "ahora". */
export default function TideChart({ events, dayEvents, start, sun, now }) {
  const end = start + DAY;
  const pts = curve(events, start, end);
  if (pts.length < 2) return null;

  const hs = pts.map((p) => p[1]).concat(dayEvents.map((e) => e.h));
  const minH = Math.floor(Math.min(...hs, 0) * 2) / 2;
  const maxH = Math.ceil(Math.max(...hs) * 2) / 2 || 1;
  const x = (t) => PAD.l + ((t - start) / DAY) * (W - PAD.l - PAD.r);
  const y = (h) => PAD.t + (1 - (h - minH) / (maxH - minH)) * (H - PAD.t - PAD.b);

  const line = pts.map(([t, h], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(h).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.at(-1)[0]).toFixed(1)} ${H - PAD.b}L${x(pts[0][0]).toFixed(1)} ${H - PAD.b}Z`;

  const step = maxH - minH > 4 ? 2 : maxH - minH > 2 ? 1 : 0.5;
  const yTicks = [];
  for (let v = minH; v <= maxH + 1e-9; v += step) yTicks.push(v);
  const showNow = now >= start && now < end;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Curva de marea del día">
      {sun.sunrise && (
        <>
          <rect className="night" x={x(start)} y={PAD.t} width={x(sun.sunrise) - x(start)} height={H - PAD.t - PAD.b} />
          <rect className="night" x={x(sun.sunset)} y={PAD.t} width={x(end) - x(sun.sunset)} height={H - PAD.t - PAD.b} />
        </>
      )}
      {yTicks.map((v) => (
        <g key={v}>
          <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text className="axis" x={PAD.l - 4} y={y(v) + 3} textAnchor="end">
            {v.toFixed(step < 1 ? 1 : 0)}
          </text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map((hh) => (
        <text key={hh} className="axis" x={x(start + hh * HOUR)} y={H - 6} textAnchor="middle">
          {String(hh).padStart(2, '0')}h
        </text>
      ))}
      <path className="area" d={area} />
      <path className="line" d={line} />
      {dayEvents.map((e) => (
        <g key={e.t}>
          <circle className={e.high ? 'dot hi' : 'dot lo'} cx={x(e.t)} cy={y(e.h)} r="3.5" />
          <text className="label" x={x(e.t)} y={e.high ? y(e.h) - 7 : y(e.h) + 14} textAnchor="middle">
            {fmtTime(e.t)}
          </text>
        </g>
      ))}
      {showNow && <line className="now" x1={x(now)} x2={x(now)} y1={PAD.t - 6} y2={H - PAD.b} />}
    </svg>
  );
}
