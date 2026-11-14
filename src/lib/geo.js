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

/** Ubicación actual del dispositivo; null si se deniega o falla. */
export function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60000 },
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
