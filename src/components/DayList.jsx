import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dataRange, groupByDay, tideLevelScale } from '../lib/tides.js';
import { forecastByDay } from '../lib/weather.js';
import { addDays, dayKey } from '../lib/time.js';
import DayRow from './DayRow.jsx';

const PAGE = 14;

/** Lista de días desde `fromDay`, con carga progresiva al scrollear. */
export default function DayList({ fromDay, pickedDay, events, offline, forecast, port, now }) {
  const [count, setCount] = useState(PAGE);
  const [openDay, setOpenDay] = useState(null);
  const sentinel = useRef(null);
  const byDay = useMemo(() => (events ? groupByDay(events) : new Map()), [events]);
  const levelOf = useMemo(() => tideLevelScale(events ?? []), [events]);
  const wxByDay = useMemo(() => forecastByDay(forecast), [forecast]);

  // Sólo al elegir otra fecha o puerto: a medianoche la lista sigue como estaba.
  useEffect(() => {
    setCount(PAGE);
    setOpenDay(null);
  }, [pickedDay, port.id]);

  const days = useMemo(() => {
    const out = [];
    for (let i = 0, k = fromDay; i < count && k <= dataRange.last; i++, k = addDays(k, 1)) out.push(k);
    return out;
  }, [fromDay, count]);
  const exhausted = days.length < count;

  useEffect(() => {
    if (exhausted || !sentinel.current) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setCount((c) => c + PAGE), {
      rootMargin: '400px',
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [exhausted, days.length]);

  const toggle = useCallback((k) => setOpenDay((o) => (o === k ? null : k)), []);
  const today = dayKey(now);
  const tomorrow = addDays(today, 1);

  if (offline)
    return (
      <p className="muted center">
        Sin conexión y sin copia guardada de este puerto. Las mareas aparecen apenas vuelva la señal.
      </p>
    );
  if (!events) return <p className="muted center">Cargando mareas…</p>;
  if (fromDay > dataRange.last)
    return (
      <p className="muted center">
        Todavía no hay tablas del SHN para {fromDay.slice(0, 4)}. Se agregan cuando el SHN las publique.
      </p>
    );
  if (fromDay < dataRange.first) return <p className="muted center">No hay tablas del SHN cargadas para esa fecha.</p>;

  return (
    <div className="days">
      {days.map((k) => (
        <DayRow
          key={k}
          dayKey={k}
          label={k === today ? 'Hoy' : k === tomorrow ? 'Mañana' : null}
          dayEvents={byDay.get(k) ?? []}
          events={events}
          levelOf={levelOf}
          wxHours={wxByDay.get(k)}
          wxFetchedAt={forecast?.fetchedAt}
          port={port}
          open={openDay === k}
          onToggle={toggle}
          now={now}
        />
      ))}
      {exhausted ? (
        <p className="muted center">Fin de las tablas disponibles ({dataRange.last.slice(0, 4)}).</p>
      ) : (
        <div ref={sentinel} className="sentinel" />
      )}
    </div>
  );
}
