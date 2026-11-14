// Íconos SVG en línea (sin dependencias).

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const wave = (y) => `M3 ${y}c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0`;

/** Olas: 2 líneas para bajamar, 3 para pleamar. */
export function Waves({ high, size = 30 }) {
  const ys = high ? [7, 12, 17] : [10, 15];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...base} strokeWidth={1.8}>
      {ys.map((y) => (
        <path key={y} d={wave(y)} />
      ))}
    </svg>
  );
}

export const ArrowUp = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const ArrowDown = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

function SunHorizon({ up }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} strokeWidth={1.7}>
      <path d="M2 18h20M6 18a6 6 0 0 1 12 0" />
      <path d="M12 4v3M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4" />
      <path d={up ? 'M9.5 22 12 19.5 14.5 22' : 'M9.5 19.5 12 22l2.5-2.5'} />
    </svg>
  );
}
export const Sunrise = () => <SunHorizon up />;
export const Sunset = () => <SunHorizon />;

export const Calendar = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

export const Search = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const Close = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Pin = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const ChevronDown = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * Luna según su edad (0..1). Vista desde el hemisferio sur:
 * creciente iluminada a la izquierda, menguante a la derecha.
 */
export function Moon({ age, size = 26 }) {
  const r = 10;
  const c = 12;
  const k = Math.cos(2 * Math.PI * age); // 1 nueva, -1 llena
  const rx = Math.abs(k) * r;
  const gibbous = k < 0;
  // Parte iluminada dibujada a la derecha; se espeja si es creciente (hemisferio sur).
  const d = `M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} A${rx} ${r} 0 0 ${gibbous ? 1 : 0} ${c} ${c - r}Z`;
  const waxing = age < 0.5;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="moon">
      <circle cx={c} cy={c} r={r} className="moon-dark" />
      <path d={d} className="moon-lit" transform={waxing ? `matrix(-1 0 0 1 ${2 * c} 0)` : undefined} />
      <circle cx={c} cy={c} r={r} fill="none" className="moon-edge" />
    </svg>
  );
}
