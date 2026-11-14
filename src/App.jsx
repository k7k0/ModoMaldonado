import { useCallback, useEffect, useRef, useState } from 'react';
import { dataRange, loadEvents, portById, ports } from './lib/tides.js';
import { getPosition, nearestPort } from './lib/geo.js';
import { dayKey } from './lib/time.js';
import { useNow, useStoredState } from './hooks.js';
import StatusCard from './components/StatusCard.jsx';
import DayList from './components/DayList.jsx';
import PortPicker from './components/PortPicker.jsx';
import { Calendar, ChevronDown } from './components/icons.jsx';

const DEFAULT_PORT = 'MARD';

export default function App() {
  const now = useNow();
  const today = dayKey(now);
  const [savedId, setSavedId] = useStoredState('mm.port', DEFAULT_PORT);
  const [portId, setPortId] = useState(() => (portById.has(savedId) ? savedId : DEFAULT_PORT));
  const [day, setDay] = useState(null); // null = hoy
  const [pos, setPos] = useState(null);
  const [events, setEvents] = useState(null);
  const [picking, setPicking] = useState(false);
  const dateInput = useRef(null);
  const port = portById.get(portId);

  // Al abrir: ubicación -> puerto más cercano (si el usuario todavía no eligió otro).
  const chosen = useRef(false);
  useEffect(() => {
    getPosition().then((p) => {
      if (!p) return;
      setPos(p);
      if (!chosen.current) setPortId(nearestPort(ports, p).id);
    });
  }, []);

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
      chosen.current = true;
      setPortId(id);
      setSavedId(id);
      setPicking(false);
      window.scrollTo(0, 0);
    },
    [setSavedId],
  );

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
        <button className="port-btn" onClick={() => setPicking(true)}>
          <span className="port-name">{port.name}</span>
          {port.area && <span className="port-area">{port.area}</span>}
          <ChevronDown className="port-chevron" />
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
      </footer>

      {picking && <PortPicker currentId={portId} pos={pos} onSelect={selectPort} onClose={() => setPicking(false)} />}
    </div>
  );
}
