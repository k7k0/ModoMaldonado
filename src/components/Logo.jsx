// Cangrejo de Modo Maldonado (mismo dibujo que public/icon.svg), en currentColor.
const Half = () => (
  <>
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M37 50 C29 48 24 43 23 34" strokeWidth="7" />
      <path d="M31 57 L16 50 L7 58" strokeWidth="4.6" />
      <path d="M30 63 L13 63 L6 73" strokeWidth="4.6" />
      <path d="M33 68 L19 74 L15 85" strokeWidth="4.6" />
      <path d="M44 46 L43 40" strokeWidth="3" />
    </g>
    <path d="M23 37 C13 35 9 25 13 15 C16 8 23 6 29 7 C24 11 23 16 25 20 C28 16 33 14 36 16 C35 27 31 36 23 37Z" />
    <circle cx="43" cy="39" r="2.7" />
    <path d="M50 44 L36 44 C30 45 26 49 25 54 C25 60 28 64 33 68 C38 72 44 74 50 74Z" />
  </>
);

export default function Logo({ size = 32, className }) {
  return (
    <svg viewBox="0 4 100 86" width={size} height={size * 0.86} fill="currentColor" className={className} aria-hidden="true">
      <Half />
      <g transform="matrix(-1 0 0 1 100 0)">
        <Half />
      </g>
    </svg>
  );
}
