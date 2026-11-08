# vihconectados · Fase 1

Plataforma de demostración para el seguimiento longitudinal de la cobertura del TAR oral, experiencia del paciente, actuaciones CMO y coordinación Farmacia Hospitalaria–Infecciosas.

**Autor: Dr. Ramón Morillo Verdugo.** Solo datos sintéticos. Apoyo a revisión profesional; no es un producto clínicamente validado ni un sistema de prescripción. No introducir datos reales. No contiene formularios de identificación, publicación de datos ni envío de comunicaciones.

## Ejecutar

Requiere Node.js 22 o superior. La aplicación no necesita paquetes externos para ejecutarse:

```sh
npm start
```

El servidor usa el puerto 5173 (`PORT` permite cambiarlo). Abra el servidor en su navegador según el mecanismo de acceso de su entorno. Use un origen local o HTTPS para las funciones de huella CSV (`crypto.subtle`). No requiere claves, cuentas, bases de datos o servicios de pago. Sin compilación: módulos ES nativos, HTML y CSS, sin CDN ni tipografías remotas.

## Recorrido de demostración

La primera apertura crea tres casos independientes y fija la fecha de evaluación inicial en **2026-11-08** para reproducibilidad. Puede cambiarla con el selector de corte (final excluido).

1. **DEMO-001:** hueco de cobertura y barreras sintéticas. Abra el caso, revise señales y registre una revisión simulada.
2. En **Experiencia**, añada una visita con opciones cerradas; en **Intervenciones CMO**, seleccione un texto y marque la actuación como realizada.
3. Genere un informe y avance por pendiente → comunicado → recibido → valorado → resuelto. **No se envía nada.** Se conserva cada transición.
4. **DEMO-002:** cambio TAR_A → TAR_B sin dispensación del nuevo episodio. El sobrante anterior no cubre el nuevo TAR.
5. **DEMO-003:** cobertura más continua, sin señales con los parámetros iniciales. Esto no prueba adherencia ni control clínico.
6. Cree un caso ficticio: su identificador DEMO se genera automáticamente. Registre un TAR, descargue su plantilla CSV e impórtela desde archivo o texto. Importe de nuevo para comprobar la detección de duplicados.

## Funciones operativas y simulaciones

| Capacidad | Implementación |
|---|---|
| Casos | Identificador generado, nivel CMO asignado manualmente, TAR ficticio A/B/C+D |
| Histórico | Eventos anexados para niveles, visitas, episodios TAR, lotes, actuaciones, revisiones e informes; sin edición destructiva |
| Cobertura | Ventana configurable, episodios independientes, intersección de componentes, arrastre dentro del episodio, trazabilidad del lote |
| CSV | Esquema cerrado, validación previa, rechazo atómico de conflictos, duplicados omitidos, SHA-256 del contenido |
| Señales | Cobertura bajo parámetro demo, dificultades referidas ausencia de intervalo evaluable y dispensaciones fuera de episodio; texto y versión explícitos |
| Experiencia | Barreras, dificultad, efectos referidos, carga y preferencia; opciones sintéticas, sin escala clínica |
| CMO | Biblioteca literal por nivel y guion SEFH con atribución/páginas; selección profesional |
| Comunicación | Informe con instantánea independiente y estados secuenciales; sin mensajes reales |
| Evaluación | Panel, historia, impresión/PDF del informe, JSON por informe y exportación completa |

No hay autenticación, roles, servidor de datos, recuperación multidispositivo, correo, conexión con historia clínica, CIMA, FHIR operativo, IA ni soporte para TAR inyectable. El repositorio local del navegador es una **simulación de almacenamiento**, no una garantía de integridad frente a manipulación. Borrar los datos del sitio elimina la demostración; volver a abrirla genera los tres casos iniciales. No se admite importar una copia JSON como historial clínico.

## CSV

```csv
fecha;episodio;componente;dias
2026-05-01;UUID_DEL_EPISODIO;A;30
```

Obtenga el UUID y componentes válidos mediante **Descargar CSV de ejemplo** en el caso. Las fechas son ISO, días enteros entre 1 y 400. Es un esquema deliberadamente limitado: no admite comillas, columnas libres ni separadores dentro de campos. Hasta 100 KB y 1000 filas. La clave de deduplicación es fecha + episodio + componente; diferente cantidad con esa clave bloquea el lote completo. Las filas idénticas se omiten, conservando sus números de línea. No se almacena el CSV original; sí sus filas normalizadas, hash SHA-256, UUID de lote y fecha de registro. El hash permite comparar archivos y no es una firma de autenticidad.

## Cálculo y límites

- Intervalos UTC `[inicio, fin)`; final de evaluación excluido. Denominador desde el máximo entre inicio de ventana y primer TAR registrado. No se recorta al primer suministro.
- Arrastre de recogidas anticipadas dentro del mismo componente y episodio, incluso si son previas al inicio de la ventana. Cada nuevo inicio de TAR cierra el anterior. No se aceptan inicios retroactivos anteriores al último inicio.
- Para TAR_CD se requiere cobertura simultánea de C y D. No se suman porcentajes de componentes. Solo se modela un régimen oral activo cada día, sin solapamientos clínicos de transición.
- Los tratamientos previos y dispensaciones se conservan. La vista de cálculo actual se recalcula con nuevos datos; los **informes guardados no se recalculan**. Cada informe incluye datos fuente y reglas. Informes previos se referencian por ID para evitar copias recursivas.
- Las dispensaciones del episodio antiguo posteriores a un cambio registrado se excluyen del cálculo y se conservan como datos históricos. Su conciliación requiere revisión profesional; no se altera su contenido.
- 180 días y 90 % proceden de reglas v0.2.0 de la referencia y están pendientes de validación. Configuración de sesión versionada; los informes guardan sus parámetros. No se utiliza ese umbral para diagnosticar, priorizar riesgo ni ajustar TAR.
- La cobertura es disponibilidad teórica, no ingesta. No incorpora farmacia externa, ingresos, suspensión, reservas iniciales, pérdidas o decisiones clínicas. Un resultado de 0 % significa ausencia de cobertura registrada, no incumplimiento demostrado.

## Arquitectura

- `src/motor.js`: funciones puras de cobertura, CSV, señales y transiciones.
- `src/almacen.js`: comandos que anexan eventos y puerto `leer()/guardar()` para sustituir el adaptador local.
- `src/informes.js`: instantáneas e informe imprimible.
- `src/demo.js`: casos ficticios reproducibles.
- `src/app.js`, `src/estilos.css`: interfaz responsive y formularios cerrados.
- `servidor.mjs`: servidor de archivos con rutas permitidas y CSP; sin API de escritura.
- `datos/`: copias literales de biblioteca y guion VIH con sus metadatos de origen.

Esquemas `vihconectados/demo@1` y `vihconectados/informe@1`; versión de aplicación 0.1.0. El adaptador institucional futuro necesita comandos validados en servidor, concurrencia y autorización; reemplazar localStorage por una API no basta.

## Pruebas

```sh
npm test
npm run check
# Solo para pruebas de navegador; instalación congelada con lockfile:
npm ci
# En otra terminal: npm start
npm run test:browser
```

La prueba de navegador usa Chromium del sistema (`/usr/bin/chromium`), configurable con `CHROMIUM_PATH`. Usa el puerto 5173. Playwright es solo dependencia de desarrollo. Comprueba circuito hasta resolución, visita, rechazo de CSV identificativo, creación/persistencia, CSV válido y duplicado, exportación JSON, contenido preparado para impresión, consola sin errores y ausencia de desbordamiento global a 390 px. Las capturas se guardan en `/tmp/vih-panel.png` y `/tmp/vih-mobile.png`. `--no-sandbox` se usa únicamente en este ejecutor aislado de pruebas; no es configuración de despliegue clínico.

Véanse [auditoría y mapa de reutilización](docs/AUDITORIA.md), [limitaciones y piloto](docs/PILOTO.md) y [validación ejecutada](docs/VALIDACION.md). Pruebas de software no equivalen a validación clínica.

## Fuentes, atribución y derechos

Auditado `ramonmorillo/preparadorconsulta` en commit `42402cb6875cad7881b52406a4253f2960260a14`, sin modificar su código ni su repositorio. Biblioteca VIH: fuente declarada `cmo-vih-app`, commit `c963da9`, catálogo acumulativo con discrepancia declarada respecto a nivel propio, pendiente de revisión clínica. Guion: *Adaptación del modelo de Atención Farmacéutica CMO al paciente con infección por VIH*, SEFH/MAPEX, 2023, capítulo 4, pp. 24–34. Se preservan metadatos y textos. El PDF original no se ha contrastado en esta fase.

Las adaptaciones son propiedad de SEFH. No existe archivo LICENSE en la referencia: no se presume una licencia de redistribución ni se otorgan derechos sobre contenido ajeno. Confirmar permisos y atribución antes de redistribuir o desplegar un piloto.
