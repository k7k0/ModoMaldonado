import { useEffect, useState } from 'react';

// En desarrollo, ?t=2026-11-14T19:30-03:00 simula otra hora.
const devParam = import.meta.env.DEV && new URLSearchParams(location.search).get('t');
const offset = devParam ? Date.parse(devParam) - Date.now() : 0;
const clock = () => Date.now() + offset;

/** Hora actual, refrescada cada `intervalMs`. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const id = setInterval(() => setNow(clock()), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && setNow(clock());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Estado persistido en localStorage (tolerante a navegadores sin storage). */
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v != null ? JSON.parse(v) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}
