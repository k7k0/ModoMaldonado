import { portById } from '../lib/tides.js';
import { fmtCoords } from '../lib/geo.js';

const signedMin = (m) => `${m < 0 ? '−' : '+'}${Math.floor(Math.abs(m) / 60)}h ${String(Math.abs(m) % 60).padStart(2, '0')}m`;
const signedM = (v) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(2)} m`;
const hm = (m) => (m == null ? null : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`);

/** Datos del puerto según el SHN (y correcciones aplicadas si es secundario). */
export default function PortInfo({ port }) {
  const rows = [['Posición', fmtCoords(port.lat, port.lon)]];

  if (port.type === 'secondary') {
    const patron = portById.get(port.patron);
    const c = port.corr;
    rows.push(
      ['Puerto patrón', patron?.name ?? port.patron],
      ['Corrección pleamar', `${signedMin(c.dtPm)} · ${signedM(c.dhPm)}`],
      ['Corrección bajamar', `${signedMin(c.dtBm)} · ${signedM(c.dhBm)}`],
    );
    if (port.meanLevel != null) rows.push(['Nivel medio', `${port.meanLevel.toFixed(2)} m`]);
    if (port.meanRange != null) rows.push(['Amplitud media', `${port.meanRange.toFixed(2)} m`]);
    if (port.ebbDuration != null) rows.push(['Duración de la bajante', hm(port.ebbDuration)]);
    if (port.est != null) rows.push(['Establecimiento de puerto', hm(port.est)]);
  } else {
    if (port.regime) rows.push(['Régimen', port.regime]);
    if (port.meanLevel != null) rows.push(['Nivel medio', `${port.meanLevel.toFixed(2)} m`]);
    if (port.stats) {
      const s = port.stats;
      rows.push(
        ['Pleamar máx. / media', `${s.hwMax.toFixed(2)} / ${s.hwMean.toFixed(2)} m`],
        ['Bajamar mín. / media', `${s.lwMin.toFixed(2)} / ${s.lwMean.toFixed(2)} m`],
        ['Amplitud máx. / media', `${s.rangeMax.toFixed(2)} / ${s.rangeMean.toFixed(2)} m`],
      );
    }
    if (port.est) rows.push(['Establecimiento de puerto', port.est]);
    if (port.charts) rows.push(['Cartas', port.charts]);
  }

  return (
    <section className="port-info">
      <h4>
        {port.type === 'secondary' ? 'Puerto secundario' : 'Puerto patrón'}
        {port.approx && <span className="badge warn">aproximado</span>}
      </h4>
      <dl className="facts">
        {rows.map(([k, v]) => (
          <div className="fact" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="note">
        Alturas sobre el plano de reducción
        {port.meanLevel != null && ` (${port.meanLevel.toFixed(2)} m debajo del nivel medio)`}. Horas en hora oficial
        argentina.
        {port.type === 'secondary' &&
          ' Calculado con las correcciones de la Tabla de Puertos Secundarios del SHN sobre el puerto patrón.'}
        {port.approx && ' El SHN no publica todas las correcciones de este puerto; las faltantes se tomaron iguales a las de pleamar o en cero.'}
      </p>
    </section>
  );
}
