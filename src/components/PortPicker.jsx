import { useEffect, useMemo, useRef, useState } from 'react';
import { ports } from '../lib/tides.js';
import { distanceKm } from '../lib/geo.js';
import { Close, Pin, Search } from './icons.jsx';

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Selector de puerto a pantalla completa, con búsqueda y orden por cercanía. */
export default function PortPicker({ currentId, pos, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const input = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return ports
      .map((p) => ({ ...p, dist: pos ? distanceKm(pos.lat, pos.lon, p.lat, p.lon) : null, hay: fold(`${p.name} ${p.area ?? ''}`) }))
      .filter((p) => words.every((w) => p.hay.includes(w)))
      .sort((a, b) => (pos ? a.dist - b.dist : 0));
  }, [q, pos]);

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="Elegir puerto">
      <div className="picker-head">
        <label className="picker-search">
          <Search />
          <input
            ref={input}
            type="search"
            placeholder="Buscar puerto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <Close />
        </button>
      </div>
      {pos && !q && (
        <p className="picker-hint">
          <Pin /> Ordenados por cercanía a tu ubicación
        </p>
      )}
      <ul className="picker-list">
        {list.map((p) => (
          <li key={p.id}>
            <button className={p.id === currentId ? 'current' : ''} onClick={() => onSelect(p.id)}>
              <span className="picker-name">
                {p.name}
                {p.area && <small>{p.area}</small>}
              </span>
              <span className="picker-meta">
                <span className={`badge ${p.type}`}>{p.type === 'primary' ? 'Patrón' : 'Secundario'}</span>
                {p.dist != null && <small>{p.dist < 10 ? p.dist.toFixed(1) : Math.round(p.dist)} km</small>}
              </span>
            </button>
          </li>
        ))}
        {!list.length && <li className="muted picker-empty">No se encontraron puertos</li>}
      </ul>
    </div>
  );
}
