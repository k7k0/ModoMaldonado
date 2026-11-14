// Distancias y búsqueda del puerto más cercano.

const R = 6371; // km

export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestPort(ports, pos) {
  let best = null;
  let bestD = Infinity;
  for (const p of ports) {
    const d = distanceKm(pos.lat, pos.lon, p.lat, p.lon);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

/**
 * Ubicación actual del dispositivo (pide permiso la primera vez).
 * Rechaza con Error cuyo `code` es 'denied', 'unavailable' o 'unsupported'.
 */
export function getPosition() {
  return new Promise((resolve, reject) => {
    const fail = (code) => reject(Object.assign(new Error(code), { code }));
    if (!navigator.geolocation) return fail('unsupported');
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => fail(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60000 },
    );
  });
}

/** "38°47' S  62°18' O" */
export function fmtCoords(lat, lon) {
  const f = (v, pos, neg) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = Math.round((a - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}' ${v < 0 ? neg : pos}`;
  };
  return `${f(lat, 'N', 'S')}  ${f(lon, 'E', 'O')}`;
}
