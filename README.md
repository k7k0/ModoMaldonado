# Modo Maldonado · Mareas

**https://modomaldonado.netlify.app**

Tablas de marea de los puertos argentinos (patrones y secundarios) a partir de las
predicciones del Servicio de Hidrografía Naval. La app es estática y funciona sin conexión.

## Desarrollo

```sh
npm install
npm run dev        # http://localhost:5173 (también accesible desde el celular en la misma red)
npm run build      # genera dist/ minificado
npm run preview    # sirve dist/ (con service worker)
```

## Datos

Los datos se descargan del SHN y se guardan en el repo, así la app no consulta nada online.

```sh
node scripts/scrape-secondary.mjs        # Tabla de Puertos Secundarios -> scripts/out/secondary.json
node scripts/scrape-primary.mjs 2027     # Tablas de puertos patrones -> scripts/out/primary-2027.json
npm run data:build                       # -> src/data/ports.json y public/data/<año>/*.json
```

### Año nuevo

```sh
npm run data:year 2027
```

Verifica que el SHN ya lo publique, borra `scripts/.cache` (si no, se reusan el formulario y la
tabla de secundarios viejos), descarga secundarios y el año, regenera los datos y muestra qué
puertos aparecieron, desaparecieron o cambiaron de corrección. Los años anteriores se conservan:
no borrar `scripts/out/primary-<año>.json` de años que se quieran seguir mostrando (para sacar
uno viejo, borrar ese archivo y `public/data/<año>/` y correr `npm run data:build`).

`build-data` frena si el puerto por defecto o algún spot de Windguru (`src/config.js`) no existe
en los datos, por ejemplo si el SHN cambió un nombre.

Una GitHub Action (`.github/workflows/shn-nuevo-anio.yml`) revisa el día 1 de cada mes si el SHN
publicó un año nuevo y, si es así, abre un issue con estos pasos. Se puede correr a mano desde la
pestaña Actions.

### Cálculo

- **Puertos patrones:** horas y alturas tal cual las publica el SHN (hora oficial argentina, UTC-3).
- **Puertos secundarios:** a cada pleamar/bajamar del puerto patrón se le suma la corrección de
  hora y de altura de la Tabla de Puertos Secundarios. Se omiten los puertos que sólo tienen
  corrección para pleamares de sicigia (Malvinas). Si falta alguna corrección se usa la de
  pleamar (hora) o cero (altura) y el puerto se marca como aproximado.
- **Canales sin posición propia** (Canal Principal a Bahía Blanca, calculado sobre Puerto Belgrano):
  se usa la posición del puerto base para el sol y el pronóstico.
- **Altura actual / curva:** interpolación cosenoidal entre mareas consecutivas.
- **Sol y luna:** calculados localmente (algoritmo NOAA y mes sinódico medio).
- **Pronóstico del tiempo** (viento en km/h, ráfagas, temperatura, lluvia): [Open-Meteo](https://open-meteo.com),
  CC BY 4.0. Viento, ráfagas y temperatura del modelo GFS (el que Windguru muestra por defecto);
  lluvia como mediana de GFS, ECMWF e ICON, ignorando menos de 0.2 mm/h. Es lo único que se consulta online; se guarda en el navegador y se refresca cada hora.
  Sin conexión se muestra el último pronóstico (hasta 3 días). Los spots de Windguru por puerto se
  configuran en `WINDGURU_SPOTS` (`src/config.js`).

## Diseño

- `design/`: originales (fotos y bosquejo del logo). En `public/photos` van las versiones
  recortadas en WebP; el logo vectorizado está en `src/components/Logo.jsx` y `public/icon.svg`.
- La foto de la tarjeta de estado depende sólo de la hora: una por cada franja de 2 horas
  (ver `PHOTOS` en `StatusCard.jsx`).
- Fotos nuevas: dejar los originales en `design/nuevas/` (ignorada por git). Se enderezan, se recortan
  a 1.8:1 con el motivo en la franja central, se pasan a WebP de 1200 px sin metadatos (sin GPS)
  y van a `public/photos/`; agregarlas también a la lista de precarga de `public/sw.js`.
- En desarrollo, `?t=2026-11-14T19:30-03:00` en la URL simula otra hora.
- `public/og-image.jpg` (1200×630) es la vista previa al compartir el link; `apple-touch-icon.png`
  e `icon-192/512.png` son el ícono en PNG para iOS/Android.

## Publicación

Netlify publica automáticamente cada cambio que entra a `main` en https://modomaldonado.netlify.app
(configuración en `netlify.toml`).

`main` está protegida: los cambios van por pull request y sólo se pueden mergear cuando el
deploy preview de Netlify terminó bien. Netlify comenta en el PR el link al preview para
probarlo (por ejemplo, desde el celular) antes de publicarlo.

```sh
git checkout -b mi-cambio
git push -u origin mi-cambio
gh pr create --fill
```

## Licencia

El código se publica bajo licencia [MIT](LICENSE).

Las predicciones de marea son del [Servicio de Hidrografía Naval](https://www.hidro.gov.ar)
y se redistribuyen sólo como referencia; no son aptas para navegación.
