# Modo Maldonado · Mareas

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

Para agregar un año nuevo cuando el SHN lo publique: correr `scrape-primary.mjs <año>` y
`data:build`. Los años anteriores se conservan (cada `primary-<año>.json` genera su carpeta).
Las descargas se cachean en `scripts/.cache` (borrarla para forzar una nueva descarga).

### Cálculo

- **Puertos patrones:** horas y alturas tal cual las publica el SHN (hora oficial argentina, UTC-3).
- **Puertos secundarios:** a cada pleamar/bajamar del puerto patrón se le suma la corrección de
  hora y de altura de la Tabla de Puertos Secundarios. Se omiten los puertos que sólo tienen
  corrección para pleamares de sicigia (Malvinas). Si falta alguna corrección se usa la de
  pleamar (hora) o cero (altura) y el puerto se marca como aproximado.
- **Altura actual / curva:** interpolación cosenoidal entre mareas consecutivas.
- **Sol y luna:** calculados localmente (algoritmo NOAA y mes sinódico medio).
