// Configuración que depende de los ids de puerto (los genera scripts/build-data.mjs a partir
// de los nombres del SHN). build-data verifica que todos existan antes de escribir los datos.

/** Puerto con el que abre la app la primera vez: Puerto Cuatreros (Maldo). */
export const DEFAULT_PORT = 'S-RINCON-DE-BAHIA-BLANCA-PUERTO-CUATREROS-MALDO';

/** Spots de Windguru por puerto (id de la URL windguru.cz/<id>). */
export const WINDGURU_SPOTS = {
  'S-RINCON-DE-BAHIA-BLANCA-PUERTO-CUATREROS-MALDO': 329647,
  'S-RINCON-DE-BAHIA-BLANCA-PUERTO-GALVAN': 329647,
  IWHI: 329647,
};
