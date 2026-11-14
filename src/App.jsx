import { useCallback, useEffect, useRef, useState } from 'react';
import { dataRange, loadEvents, portById, ports } from './lib/tides.js';
import { distanceKm, getPosition, nearestPort } from './lib/geo.js';
import { dayKey } from './lib/time.js';
import { useNow, useStoredState } from './hooks.js';
import StatusCard from './components/StatusCard.jsx';
import DayList from './components/DayList.jsx';
import PortPicker from './components/PortPicker.jsx';
import { Calendar, ChevronDown, Locate } from './components/icons.jsx';
import Logo from './components/Logo.jsx';

const DEFAULT_PORT = 'S-RINCON-DE-BAHIA-BLANCA-PUERTO-CUATREROS-MALDO'; // Puerto Cuatreros (Maldo)

const LOCATE_ERRORS = {
  denied: 'Permiso de ubicación denegado. Podés habilitarlo en la configuración del navegador.',
  unavailable: 'No se pudo obtener tu ubicación. Probá de nuevo.',
  unsupported: 'Este navegador no permite obtener la ubicación.',
};

export default function App() {
  const now = useNow();
  const today = dayKey(now);
  const [savedId, setSavedId] = useStoredState('mm.port', DEFAULT_PORT);
  const [portId, setPortId] = useState(() => (portById.has(savedId) ? savedId : DEFAULT_PORT));
  const [day, setDay] = useState(null); // null = hoy
  const [pos, setPos] = useState(null);
  const [events, setEvents] = useState(null);
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState(null);
  const dateInput = useRef(null);
  const port = portById.get(portId);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    setEvents(null);
    loadEvents(port).then((ev) => alive && setEvents(ev));
    return () => {
      alive = false;
    };
  }, [port]);

  const selectPort = useCallback(
    (id) => {
      setPortId(id);
      setSavedId(id);
      setPicking(false);
      window.scrollTo(0, 0);
    },
    [setSavedId],
  );

  // La ubicación sólo se pide cuando el usuario toca "mi ubicación".
  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const p = await getPosition();
      const nearest = nearestPort(ports, p);
      setPos(p);
      selectPort(nearest.id);
      const km = distanceKm(p.lat, p.lon, nearest.lat, nearest.lon);
      setToast(`Puerto más cercano: ${nearest.name} (${km < 10 ? km.toFixed(1) : Math.round(km)} km)`);
    } catch (err) {
      setToast(LOCATE_ERRORS[err.code] ?? LOCATE_ERRORS.unavailable);
    } finally {
      setLocating(false);
    }
  };

  const openDatePicker = () => {
    const el = dateInput.current;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  const fromDay = day ?? today;

  return (
    <div className="app">
      <header className="topbar">
        <Logo size={34} className="logo" />
        <button className="port-btn" onClick={() => setPicking(true)}>
          <span className="port-name">{port.name}</span>
          {port.area && <span className="port-area">{port.area}</span>}
          <ChevronDown className="port-chevron" />
        </button>
        <button
          className={`icon-btn${locating ? ' busy' : ''}`}
          onClick={locate}
          aria-label="Usar mi ubicación"
          title="Puerto más cercano a mi ubicación"
        >
          <Locate />
        </button>
        <div className="date-btn-wrap">
          <button className="icon-btn" onClick={openDatePicker} aria-label="Elegir fecha">
            <Calendar />
          </button>
          <input
            ref={dateInput}
            className="date-input"
            type="date"
            min={dataRange.first}
            max={dataRange.last}
            value={fromDay}
            onChange={(e) => e.target.value && setDay(e.target.value === today ? null : e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </header>

      <main>
        <StatusCard port={port} events={events} now={now} />

        {day && (
          <div className="viewing">
            <span>
              Mostrando desde el {day.split('-').reverse().join('/')}
            </span>
            <button className="link-btn" onClick={() => setDay(null)}>
              Volver a hoy
            </button>
          </div>
        )}

        <DayList fromDay={fromDay} events={events} port={port} now={now} />
      </main>

      <footer className="footer">
        Fuente: Tablas de Marea del Servicio de Hidrografía Naval (hidro.gov.ar). Predicciones astronómicas: el viento y la
        presión pueden modificar la marea real. No apto para navegación.
        <br />
        <a href="https://github.com/k7k0/ModoMaldonado" target="_blank" rel="noopener noreferrer">
          Código abierto en GitHub
        </a>{' '}
        · Licencia MIT
      </footer>

      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {picking && <PortPicker currentId={portId} pos={pos} onSelect={selectPort} onClose={() => setPicking(false)} />}
    </div>
  );
}
