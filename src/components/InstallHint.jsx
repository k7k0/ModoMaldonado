import { useStoredState } from '../hooks.js';
import { Close } from './icons.jsx';

// Samsung Internet instala la app con un paquete propio que Play Protect bloquea en Android 14+
// ("se diseñó para una versión anterior de Android"); desde Chrome se instala sin problemas.
const isSamsungAndroid = /Android/i.test(navigator.userAgent) && /SamsungBrowser/i.test(navigator.userAgent);
const standalone = matchMedia('(display-mode: standalone)').matches;

/** Abre esta misma página en Chrome (si no está instalado, Android ofrece bajarlo). */
const chromeUrl = () =>
  `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;

/** Aviso para usuarios de Samsung Internet: instalar desde Chrome. */
export default function InstallHint() {
  const [dismissed, setDismissed] = useStoredState('mm.installHint', false);
  if (!isSamsungAndroid || standalone || dismissed) return null;
  return (
    <div className="install-hint" role="note">
      <p>
        Para instalar la app usá <b>Chrome</b>: desde Samsung Internet, Android la bloquea por error. En el navegador
        funciona igual.
      </p>
      <a className="link-btn" href={chromeUrl()}>
        Abrir en Chrome
      </a>
      <button className="install-hint-close" onClick={() => setDismissed(true)} aria-label="Cerrar aviso">
        <Close />
      </button>
    </div>
  );
}
