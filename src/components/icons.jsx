// Íconos SVG en línea (sin dependencias).

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/**
 * Agua que sube hasta el nivel de la marea, sobre una línea de fondo.
 * level: 0 (seco) a 1 (lleno); ver tideLevelScale.
 * chop: 0 (planchado) a 1 (ola máxima) según el viento; null = sin pronóstico (ola suave).
 */
export function TideLevel({ level, chop = null, size = 30 }) {
  const top = 5;
  const bottom = 27;
  const y = bottom - Math.max(0.04, Math.min(1, level)) * (bottom - top);
  const a = chop == null ? 2.5 : Math.max(0, Math.min(1, chop)) * 7; // altura del control de la ola
  return (
    <svg viewBox="0 0 24 30" width={size * 0.8} height={size} aria-hidden="true" className="tide-level">
      <path
        className="tide-level-water"
        d={`M2 ${y} q2.5 ${-a} 5 0 t5 0 t5 0 t5 0 V${bottom - 2} q0 2 -2 2 H4 q-2 0 -2 -2Z`}
      />
      <path className="tide-level-bed" d={`M1 ${bottom + 0.5}H23`} />
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

export const Wind = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...base}>
    <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />
  </svg>
);

export const Thermo = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...base}>
    <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
  </svg>
);

export const Drop = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...base}>
    <path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" />
  </svg>
);

const CLOUD = 'M7.5 19h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.5 19z';

/**
 * Estado del cielo (ver skyKind). De noche, luna en vez de sol.
 */
export function Sky({ kind, night = false, size = 22 }) {
  const body = night ? (
    <path className="sky-moon" d="M14.5 3.5a6.5 6.5 0 1 0 6 8.8 5.2 5.2 0 0 1-6-8.8z" />
  ) : (
    <g className="sky-sun">
      <circle cx="12" cy="10" r="4" />
      <path d="M12 2.5v1.8M12 15.7v1.8M4.5 10h1.8M17.7 10h1.8M6.7 4.7 8 6M16 14l1.3 1.3M6.7 15.3 8 14M16 6l1.3-1.3" />
    </g>
  );
  const small = 'translate(4 3) scale(.8)';
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="sky">
      {kind === 'clear' && body}
      {kind === 'partly' && (
        <>
          <g transform="translate(-3 -2)">{body}</g>
          <path className="sky-cloud" d={CLOUD} transform={small} />
        </>
      )}
      {kind === 'cloudy' && (
        <>
          <g transform="translate(-3 -3) scale(.85)">{body}</g>
          <path className="sky-cloud" d={CLOUD} transform="translate(1 1)" />
        </>
      )}
      {kind === 'overcast' && (
        <>
          <path className="sky-cloud dim" d={CLOUD} transform="translate(-3 -4) scale(.85)" />
          <path className="sky-cloud" d={CLOUD} transform="translate(1 1)" />
        </>
      )}
      {(kind === 'rain' || kind === 'heavy') && (
        <>
          <path className="sky-cloud" d={CLOUD} transform="translate(0 -4)" />
          <path
            className="sky-rain"
            d={kind === 'heavy' ? 'M8 17l-1.5 4M12 17l-1.5 4M16 17l-1.5 4' : 'M9.5 17.5l-1 3M14.5 17.5l-1 3'}
          />
        </>
      )}
    </svg>
  );
}

/** "Mi ubicación": mira con punto central. */
export const Locate = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
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
