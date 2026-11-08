# Validación técnica ejecutada

Fecha: 08/11/2026. Entorno: Node.js 24.22.1, npm 11.9.0, Chromium del sistema, Playwright fijado por package-lock.json. Resultado para MVP 0.1.0; no es validación clínica.

| Comprobación ejecutada | Resultado |
|---|---|
| `npm ci --cache /tmp/vih-npm-cache --no-audit --no-fund` | Instalación congelada correcta |
| `npm test` | 16 pruebas ejecutadas, 16 pasadas, 0 fallidas, 0 omitidas |
| `npm run check` | Sintaxis de motor, interfaz, almacenamiento e informes correcta |
| `npm run test:browser` con `npm start` | Circuito completado, persistencia verificada, consola sin errores y sin desbordamiento global a 390 px |
| Solicitud HTTP local a `/` | 200 y HTML de aplicación |
| Comparación byte a byte de ambos JSON VIH con referencia | Idénticos |
| `node --test pruebas/nucleo.test.mjs` en copia de referencia | 13 pruebas ejecutadas y pasadas; árbol de trabajo original sin cambios |

## Alcance de las pruebas propias

Fechas imposibles/bisiestas, denominador, huecos y recogidas anticipadas, arrastre previo a ventana, final excluido, futuro no incluido, intersección de componentes, corte al cambiar TAR, filas fuera de episodio tras cambios, CSV cerrado, duplicados/conflictos, aislamiento e historial, instantánea independiente, parámetros y texto explicable, secuencia completa de estados, estados inválidos, persistencia y fallo de cuota.

Prueba de navegador: carga de tres casos, informe y secuencia completa hasta resuelto, visita con preferencia cerrada, rechazo de CSV con columna identificativa, creación de caso y persistencia tras recarga; alta de TAR, descarga de plantilla, importación válida y reimportación con duplicados; JSON descargado y verificado por esquema/caso. Se invoca el botón de impresión con `window.print` sustituido por una captura de su contenido, comprobando aviso de simulación e identificador ficticio. **No verifica una impresora física ni la paginación de un PDF final.** Capturas de escritorio y móvil en `/tmp/vih-panel.png` y `/tmp/vih-mobile.png`; inspección visual realizada.

La primera ejecución en navegador detectó estilos inline incompatibles con CSP: se retiraron esos atributos; el recorrido completo posterior pasó sin errores. La primera instalación de Playwright encontró una caché no escribible; se utilizó una caché en `/tmp` y se verificó instalación congelada. No se relajaron TLS ni la política CSP.

## No comprobado / fuera de alcance

Accesibilidad formal, navegadores distintos de Chromium, pruebas de carga, auditoría de seguridad independiente, interoperabilidad institucional, entrega de mensajes, validación clínica, uso de datos reales, exactitud del PDF fuente y permisos de redistribución. El almacenamiento local no aporta una auditoría institucional resistente a manipulación. No existe una compilación de producción que ejecutar: la aplicación usa módulos ES servidos directamente.

## Revisión remota

La lectura Git de `vihconectados` funciona pero no devuelve ramas: no hay base `main` para una PR. La consulta real a `https://api.github.com/repos/ramonmorillo/vihconectados` mediante `gh api` devuelve Forbidden; no se ha solicitado ni copiado un token. El resultado del envío de la rama se informa por separado en la entrega.
