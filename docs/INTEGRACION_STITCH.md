# Integración incremental de Stitch

Base inspeccionada: rama feat/fase-1, v0.3.0. Los adjuntos son propuestas de diseño, no especificaciones clínicas validadas.

| Vista | Ruta añadida | Componentes y comandos reutilizados |
|---|---|---|
| Monitorización | #panel/poblacional | cobertura, alertas, nivel, estadoComunicacion; tarjetas y tabla |
| Cohorte | #panel/cohorte | episodios, nombreTar, cobertura; búsqueda local y filtro de señales |
| Ficha | #panel/paciente/DEMO-001 | Resumen, historia, cobertura y formularios del caso existente |
| CMO | #panel/cmo/DEMO-001 | visita, biblioteca literal, actuación pendiente/realizada, informes y transiciones |

Las rutas clásicas se conservan. Se comparte el shell y se añaden estilos limitados a estas vistas. Los módulos permanecen directamente en src porque el servidor solo sirve archivos en ese nivel; no se cambia esa política para crear subcarpetas.

## Diferencias verificadas

- Las funciones reales son cobertura y alertas, no calcularCobertura/detectarSenales. El PDC exige intersección de componentes y episodios independientes.
- El motor no calcula demora administrativa respecto a una fecha de recogida. No se sustituye por total menos días cubiertos: eso son días sin cobertura registrada en la ventana.
- Se preservan los cinco estados pendiente/comunicado/recibido/valorado/resuelto sin colapsarlos en cuatro.
- No existen carga viral, CD4, FG, CIP, NHC ni ventanas de inyectables. Se omiten, al igual que cifras ficticias de 1.240 casos y porcentajes virológicos.
- El nivel CMO es una asignación manual de demostración, no una clasificación automática validada.
- No hay HL7, Diraya/Prisma, firma electrónica, envío ni confirmación objetiva de toma por entrevista/SMAQ.
- SHA-256 es una huella del CSV, no una firma. No hay cambios de motor, persistencia o backend.

## Etapas

1. Shell responsive y monitorización con métricas derivadas, aviso metodológico y pruebas.
2. Cohorte con búsqueda local y filtro de señales existentes.
3. Ficha y cronograma de cobertura por episodio, conservando todas las herramientas clásicas.
4. Itinerario CMO de tres secciones enlazado a los comandos existentes. Cada paso registra eventos independientes; no se presenta como formulario firmado ni transacción única.

Pendiente de revisión clínica: umbral demo 90 % y ventana 180 días existentes, definición de retraso, estratificación CMO, contenido de biblioteca y cualquier futura regla clínica. No se incorporan umbrales 5/15 días ni riesgos de resistencia.

## Entrega y verificación

Base exacta: `4421a132eec7f9ba75b89956384d4be0a14c86be`. Rama local de trabajo: `feat/stitch-desktop`.

Archivos modificados: `index.html` (enlace y CSS), `src/app.js` (rutas y acciones), `package.json` (comprobaciones), `README.md` (recorrido). Nuevos: `src/desktop.js` (componentes/vistas), `src/estilos-desktop.css` (estilos aislados), `pruebas/desktop.test.mjs`, `pruebas/desktop.mjs` y este documento. Motor, almacenamiento, servidor y datos no cambian. No se añaden dependencias.

Validación ejecutada con Node 24 y Chromium del sistema:

- `npm test`: 28 pruebas superadas, incluidas escape de contenido, cinco estados y ausencia de intervalo frente a cobertura cero.
- `npm run check`: sintaxis de los módulos, incluido desktop, correcta. No existe script de lint/build.
- Pruebas existentes `pruebas/navegador.mjs` y `pruebas/publico.mjs`: superadas; circuito clásico, PDF, persistencia, portada/legal y actualización aditiva conservados.
- `node pruebas/desktop.mjs`: navegación, búsqueda, filtro de señales, ficha, apertura del formulario de experiencia, anexado persistente de actuación, informes, biblioteca sin romper el hash, caso inexistente, texto de búsqueda con HTML, acceso con Tab y ausencia de desbordamiento global a 1440/390px. Sin errores de consola ni solicitudes externas en el recorrido nuevo.
- Capturas de comprobación en `/tmp/vih-stitch-poblacional.png` y `/tmp/vih-stitch-mobile.png`, inspeccionadas visualmente.

Para revisar: `npm start`, abrir `#panel/poblacional`, pasar a Cohorte, buscar DEMO-002, abrir ficha y CMO. Añadir una actuación pendiente y recargar; los eventos previos permanecen. El filtro con señales muestra un caso en la cohorte inicial, que contiene dos señales. La tabla tiene desplazamiento horizontal local en móvil.

La comprobación de teclado es básica y no equivale a una auditoría WCAG completa. CIMA solo se prueba con respuestas sintéticas interceptadas por las pruebas existentes. No se ha verificado un servicio clínico externo, enviado mensajes, hecho merge ni desplegado a producción.
