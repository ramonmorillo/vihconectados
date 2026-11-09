# vihconectados · Fase 1 · v0.3.0

Plataforma de demostración para el seguimiento longitudinal de la cobertura del TAR oral, experiencia del paciente, actuaciones CMO y coordinación Farmacia Hospitalaria–Infecciosas.

**Autor: Dr. Ramón Morillo Verdugo.** Solo datos sintéticos. Apoyo a revisión profesional; no es un producto clínicamente validado ni un sistema de prescripción. No introducir datos reales. No contiene formularios de identificación, publicación de datos ni envío de comunicaciones.

## Ejecutar

Requiere Node.js 22 o superior. La aplicación no necesita paquetes externos para ejecutarse:

```sh
npm start
```

El servidor usa el puerto 5173 (`PORT` permite cambiarlo). Abra el servidor en su navegador según el mecanismo de acceso de su entorno. Use un origen local o HTTPS para las funciones de huella CSV (`crypto.subtle`). No requiere claves, cuentas, bases de datos o servicios de pago. Sin compilación: módulos ES nativos, HTML y CSS, sin CDN ni tipografías remotas. Las búsquedas de medicamentos consultan el catálogo público gratuito CIMA (AEMPS), desde el navegador y solo al solicitarlas.

## Recorrido de demostración

La portada permite entrar en la demostración sin registro ni contraseña. También puede acceder directamente a `#panel`. La primera apertura crea tres casos independientes y fija la fecha de evaluación inicial en **2026-11-08** para reproducibilidad. Puede cambiarla con el selector de corte (final excluido).

1. **DEMO-001:** barreras de acceso, recogidas irregulares, dos visitas e informe recibido, con coordinación pendiente. Abra el caso, revise señales y registre una revisión simulada.
2. En **Experiencia**, añada una visita con opciones cerradas; en **Intervenciones CMO**, seleccione un texto y marque la actuación como realizada.
3. Genere un informe y avance por pendiente → comunicado → recibido → valorado → resuelto. **No se envía nada.** Se conserva cada transición.
4. **DEMO-002:** cambio TAR_A → TAR_B con dispensaciones propias de cada episodio, evolución de la experiencia y comunicación valorada. El sobrante anterior no cubre el nuevo TAR.
5. **DEMO-003:** cobertura simultánea de dos componentes, dos visitas y actuaciones realizadas, sin señales con los parámetros iniciales. Esto no prueba adherencia ni control clínico.
6. Cree un caso ficticio: su identificador DEMO se genera automáticamente. En **Registrar cambio TAR**, busque el medicamento en CIMA, revise su ficha y seleccione presentación. Añada todos los medicamentos con **+ Añadir otro medicamento** y confirme la revisión. Para TAR oral, registre dispensaciones manualmente o descargue su plantilla CSV e impórtela desde archivo o texto. Importe de nuevo para comprobar la detección de duplicados.

## Funciones operativas y simulaciones

| Capacidad | Implementación |
|---|---|
| Casos | Identificador generado, nivel CMO asignado manualmente; TAR oral o intramuscular seleccionado en CIMA, hasta 8 medicamentos; ejemplos iniciales A/B/C+D conservados |
| Histórico | Eventos anexados para niveles, visitas, episodios TAR, lotes, actuaciones, revisiones e informes; sin edición destructiva |
| Cobertura | Ventana configurable, episodios independientes, intersección de componentes, arrastre dentro del episodio, trazabilidad del lote |
| Registro manual | Dispensaciones orales con validación compartida con CSV; valoración de adherencia independiente con periodo, método, resultado y porcentaje opcional |
| CSV | Esquema cerrado, validación previa, rechazo atómico de conflictos, duplicados omitidos, SHA-256 del contenido |
| Señales | Cobertura bajo parámetro demo, dificultades referidas ausencia de intervalo evaluable y dispensaciones fuera de episodio; texto y versión explícitos |
| Experiencia | Barreras, dificultad, efectos referidos, carga y preferencia; opciones sintéticas, sin escala clínica |
| CMO | Biblioteca literal por nivel y guion SEFH con atribución/páginas; selección profesional |
| Comunicación | Informe profesional con instantánea independiente y estados secuenciales; sin mensajes reales |
| Evaluación | Panel, historia, PDF A4 de informe profesional y hoja del paciente, copia para historia, JSON por informe y exportación completa |

No hay autenticación, roles, servidor de datos, recuperación multidispositivo, correo, conexión con historia clínica, FHIR operativo, IA ni cálculo de administración o ventanas de TAR inyectable. Se admite registrar su catálogo y valoraciones manuales, excluyéndolo del PDC oral. CIMA aporta únicamente datos de catálogo; no suministros, validación de pauta ni prescripción. El repositorio local del navegador es una **simulación de almacenamiento**, no una garantía de integridad frente a manipulación. Borrar los datos del sitio elimina la demostración; volver a abrirla genera los tres casos iniciales. No se admite importar una copia JSON como historial clínico.

## CSV

```csv
fecha;episodio;componente;dias
2026-05-01;UUID_DEL_EPISODIO;A;30
```

Obtenga el UUID y componentes válidos mediante **Descargar CSV de ejemplo** en el caso. Las fechas son ISO, días enteros entre 1 y 400. Es un esquema deliberadamente limitado: no admite comillas, columnas libres ni separadores dentro de campos. Hasta 100 KB y 1000 filas. La clave de deduplicación es fecha + episodio + componente; diferente cantidad con esa clave bloquea el lote completo. Con identidad de origen o reimportación inequívoca, las filas idénticas no se duplican. Si solo coincide fecha/episodio/componente, los formularios solicitan conciliación explícita y motivo antes de guardar. No se almacena el CSV original; sí sus filas normalizadas, hash SHA-256, UUID de lote y fecha de registro. El hash permite comparar archivos y no es una firma de autenticidad.

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
- `src/informes.js`: instantáneas y texto para historia; `src/vista-informes.js` y `src/informes.css`: composición A4 e impresión.
- `src/cima.js` y `src/medicacion.js`: adaptador AEMPS y selección del TAR.
- `src/recursos.js`: enlaces y atribución de MAPEX-ADHEFAR Hub.
- `src/demo.js`: escenarios ficticios reproducibles y actualización aditiva de cohorte.
- `src/portada.js`, `src/legal.js`, `src/institucional.css`: presentación, información legal y futuro acceso de hospitales.
- `src/acceso.js`: contrato de proveedor de acceso y adaptador exclusivo de demostración, sin autenticación real.
- `src/app.js`, `src/estilos.css`: interfaz responsive y formularios cerrados.
- `servidor.mjs`: servidor de archivos con rutas permitidas y CSP; sin API de escritura.
- `datos/`: copias literales de biblioteca y guion VIH con sus metadatos de origen.

Esquemas `vihconectados/demo@1`, `vihconectados/informe@1` y `vihconectados/informe-paciente@1`; versión de aplicación 0.3.0. Los datos guardados de la versión anterior se conservan sin migración destructiva. El adaptador institucional futuro necesita comandos validados en servidor, concurrencia y autorización; reemplazar localStorage por una API no basta.

## Pruebas

```sh
npm test
npm run check
# Solo para pruebas de navegador; instalación congelada con lockfile:
npm ci
# En otra terminal: npm start
npm run test:browser
```

La prueba de navegador intercepta CIMA con fichas sintéticas (no verifica el catálogo real) y usa Chromium del sistema (`/usr/bin/chromium`), configurable con `CHROMIUM_PATH`. Usa el puerto 5173. Playwright es solo dependencia de desarrollo. Comprueba circuito hasta resolución, visita, rechazo de CSV identificativo, creación/persistencia, CSV válido y duplicado, exportación JSON, PDF reales A4 de ambas modalidades, portapapeles y alternativa manual, consola sin errores y ausencia de desbordamiento global a 390 px. Las capturas se guardan en `/tmp/vih-panel.png` y `/tmp/vih-mobile.png`. `--no-sandbox` se usa únicamente en este ejecutor aislado de pruebas; no es configuración de despliegue clínico.

Véanse [auditoría y mapa de reutilización](docs/AUDITORIA.md), [limitaciones y piloto](docs/PILOTO.md) y [validación ejecutada](docs/VALIDACION.md). Pruebas de software no equivalen a validación clínica.

## Fuentes, atribución y derechos

Auditado `ramonmorillo/preparadorconsulta` en commit `42402cb6875cad7881b52406a4253f2960260a14`, sin modificar su código ni su repositorio. Biblioteca VIH: fuente declarada `cmo-vih-app`, commit `c963da9`, catálogo acumulativo con discrepancia declarada respecto a nivel propio, pendiente de revisión clínica. Guion: *Adaptación del modelo de Atención Farmacéutica CMO al paciente con infección por VIH*, SEFH/MAPEX, 2023, capítulo 4, pp. 24–34. Se preservan metadatos y textos. El PDF original no se ha contrastado en esta fase.

Las adaptaciones son propiedad de SEFH. No existe archivo LICENSE en la referencia: no se presume una licencia de redistribución ni se otorgan derechos sobre contenido ajeno. Confirmar permisos y atribución antes de redistribuir o desplegar un piloto.

## Novedades 0.2 · Medicación, informes y recursos

### TAR desde CIMA

**Registrar cambio TAR** abre la búsqueda por nombre o principio activo y un enlace a la web oficial AEMPS. La ficha se consulta antes de añadir el medicamento. Es obligatorio seleccionar una presentación comercializada y confirmar que la selección representa el TAR completo del caso ficticio. Se guardan número de registro, nombre, principios activos, ATC, vía, CN/presentación, fuente y fecha de consulta como instantánea del episodio. El mismo número de registro no puede añadirse dos veces.

La vía debe constar como oral o intramuscular; las fases de distinta vía se registran en episodios independientes. El filtro de catálogo admite familias ATC J05AE/AF/AG/AJ/AR y códigos J05AX08/09/12/29. Es un filtro técnico limitado, no una validación de indicación VIH, régimen, dosis, edad, interacciones o adecuación clínica. La ausencia de vía/ATC o de presentación comercializada impide añadir la ficha. Los regímenes nuevos y las excepciones requieren revisión del adaptador, no eludirlo con datos inventados. No se deducen días de suministro del envase ni dosis.

Cada medicamento/registro es una unidad dispensable (una combinación fija no se descompone en principios activos). Un TAR oral con varios medicamentos exige cobertura simultánea de todos. Los episodios intramusculares se excluyen del numerador y denominador del PDC oral; no se convierten envases en días ni se calculan ventanas de administración. La plantilla usa `CIMA-<nregistro>` como componente. Cambiar de TAR o presentación crea otro episodio; no modifica registros previos ni traslada sobrantes. Los ejemplos A/B/C+D siguen siendo sintéticos y compatibles con CSV previos; no se convierten automáticamente en fármacos reales.

Solo se envían a CIMA las búsquedas de medicamento y el número de registro seleccionado, sin objeto de paciente, instrucciones, cookies ni referencia del caso. Las búsquedas se realizan por acción explícita; no hay llamadas de catálogo al abrir los casos. Sin conexión se muestra el error y no se inventa ni guarda un resultado. En este ejecutor la política de red bloquea `cima.aemps.es`: se han verificado respuestas sintéticas y los fallos del adaptador, **no la conexión real ni CORS de CIMA**. Para la comprobación en vivo se requiere acceso a ese dominio y verificar la respuesta/CORS desde el origen de despliegue. La aplicación funciona en GitHub Pages con sus rutas relativas; no necesita un proxy propio.

### Informe profesional y copia para historia clínica

Genere el informe y abra **Ver e imprimir**. La vista A4 contiene identidad ficticia, fecha de corte, cobertura con denominador, TAR, señales explicables, experiencia, actuaciones, revisión, método y autoría. La exportación JSON conserva la trazabilidad técnica; el PDF no vuelca el JSON. En **Imprimir / PDF**, elija Guardar como PDF, papel A4 y desactive las cabeceras y pies del navegador. El nombre sugerido usa tipo de documento e identificador DEMO. Es la impresión del navegador, no un generador externo ni un PDF firmado.

**Copiar para historia clínica** produce texto legible por apartados, no un volcado de objetos. Requiere permiso de portapapeles y origen seguro; si se deniega aparece un cuadro de solo lectura seleccionado para copiar manualmente. No se conecta ni envía nada a una historia clínica. No pegar los casos ficticios en una historia clínica real.

### Hoja para el propio paciente

**Crear hoja para el paciente** permite redactar instrucciones específicas sintéticas (máximo 2000 caracteres), acordar una próxima cita y decidir si incluir el recurso de adherencia. Es obligatoria la confirmación de revisión profesional y de contenido sintético. No hay campos de nombre/contacto ni envío/publicación de estas instrucciones. No se generan pautas ni dosis a partir del catálogo. La hoja usa lenguaje directo y una composición más legible, sin trasladar señales o métricas técnicas al paciente. Guarda la medicación y las instrucciones tal como estaban al generar el documento. No participa en los estados de comunicación a Infecciosas ni se modifica al añadir visitas posteriores.

### Recursos de adherencia

La navegación incluye **Recursos de adherencia** con [MAPEX-ADHEFAR Hub](https://ramonmorillo.es/adhefarmapexhub/) y su espacio para pacientes y cuidadores. Se enlaza, sin incrustar contenido ni enviar contexto clínico. Se puede incluir en la hoja del paciente. Se ha consultado en solo lectura el repositorio `ramonmorillo/adhefarmapexhub`, commit `8750436e9e263424da44f5f32e8d7702c6240c05`, para confirmar las páginas y atribución. No se ha incorporado su motor ni se han convertido sus materiales en reglas clínicas.

## Novedades 0.3 · Autoría, presentación y hospitales

La portada `#inicio` presenta el proyecto, su autor y el circuito asistencial. El botón **Entrar en la demostración** mantiene el acceso libre. No hay registro ni requisito de aceptar una falsa cuenta. Las rutas directas de la aplicación continúan disponibles.

El pie de todas las pantallas enlaza seis apartados: autoría y reconocimiento, condiciones de uso, privacidad/almacenamiento, aviso legal, fuentes/citación y accesibilidad. Se han adaptado al comportamiento real de vihconectados tomando como referencia el enfoque legal del proyecto MAPEX-ADHEFAR: autoría de Ramón Morillo Verdugo, vocación gratuita/no comercial y prudencia sobre cesión o aval institucional. No se afirma que haya una cesión formal, derechos sobre contenidos ajenos, certificación de accesibilidad o cumplimiento institucional ya aprobado. Los datos de explotación y contacto institucional deberán completarse antes de habilitar un servicio real.

`#hospitales` explica el futuro acceso con cuentas personales asociadas al hospital, permisos diferenciados y separación de datos aplicada en servidor. **No hay un formulario de contraseñas, usuarios reales, servidor de identidad, Supabase o aislamiento hospitalario activo.** El adaptador actual devuelve un contexto sin identidad ni roles y rechaza el inicio de sesión. Véase [diseño de acceso hospitalario](docs/ACCESO_HOSPITALARIO.md); cambiar una constante o esconder botones no habilita seguridad institucional.

### Casos actualizados sin pérdida de histórico

La cohorte `cohorte-2026-11-v2` contiene los tres perfiles descritos arriba. Sus niveles, tratamientos A/B/C/D, experiencias y estados son sintéticos. Los tratamientos no son prescripciones ni resultados clínicos reales; no se fabrican fichas CIMA.

- Navegadores sin datos cargan la nueva cohorte al abrir la aplicación.
- Si ya hay casos guardados, **Casos sintéticos → Añadir casos actualizados** incorpora solo los perfiles que falten en esta cohorte. Conserva íntegros los casos y los informes anteriores y asigna IDs nuevos. No borra, sustituye ni fusiona silenciosamente visitas.
- **Nuevo caso sintético** permite elegir un caso en blanco o un escenario. Los escenarios incluyen un nivel CMO simulado; el nivel manual se usa solo al crear en blanco. Cada caso obtiene su propia copia e historial independiente.

La prueba de navegador añade comprobaciones de portada/hospitales sin credenciales, enlaces legales, actualización aditiva de datos antiguos, alta por escenario y tamaños móvil/escritorio. No realiza solicitudes externas al explorar estas pantallas. El acceso hospitalario real y la conformidad jurídica/accesibilidad formal permanecen pendientes.

## Incremento Stitch · Estación de seguimiento

Desde la navegación, abra **Estación de seguimiento** (`#panel/poblacional`). Incluye monitorización con métricas derivadas de los casos locales, cohorte con búsqueda/filtro, ficha longitudinal con cobertura por episodio e itinerario CMO conectado a los registros existentes. La vista clásica sigue disponible.

Recorrido de revisión: monitorización → cohorte → buscar DEMO-002 → Ver ficha → Intervención CMO → registrar experiencia o añadir una actuación pendiente → marcar realizada → consultar informes. Recargar conserva los eventos. Todo es demostración local, sin envío ni firma. No se calculan retrasos de retirada, resultados virológicos ni adherencia objetiva.

`npm run test:browser` incluye ahora `pruebas/desktop.mjs`. El mapa de reutilización, diferencias con el prototipo y revisión clínica pendiente están en `docs/INTEGRACION_STITCH.md`.

La renovación visual aplica el menú azul marino, cabecera de trabajo y acentos verde azulado también al panel clásico y demás pantallas operativas. Monitorización añade tarjetas de revisión y barras de distribución CMO. La portada pública mantiene su composición. Se utilizan fuentes locales de sistema y no se descargan recursos de diseño externos.

## Combinaciones CIMA y registro manual

En **Registrar cambio TAR**, añada la presentación del primer medicamento y pulse **+ Añadir otro medicamento** para buscar el siguiente. La selección se conserva (hasta 8 medicamentos distintos), se muestra la vía y debe confirmar la revisión tras cada cambio. Se admiten combinaciones orales y combinaciones intramusculares como las presentaciones inyectables de Vocabria + Rekambys, cuando CIMA devuelve una ficha válida. No se mezclan fases orales e intramusculares en un mismo episodio.

En **Resumen** o **Cobertura TAR**, use **Registrar dispensación manual**: elija un episodio oral, fecha y días de suministro por medicamento. Deje en blanco los medicamentos no dispensados. Las mismas reglas del CSV rechazan fechas fuera del episodio, componentes ajenos, cantidades inválidas y conflictos; un duplicado no vuelve a sumar cobertura. Las entradas manuales se conservan con fuente, UUID, fecha y filas, sin inventar una huella de archivo.

**Registrar valoración manual**, en Resumen, Cobertura TAR o Experiencia, guarda fecha de evaluación, periodo [inicio, fin), método, resultado referido y porcentaje opcional 0–100. El porcentaje no se deduce de la entrevista, no aplica puntos de corte y no modifica el PDC. Cada valoración se anexa al histórico. La cohorte y los informes profesionales muestran la valoración más reciente aplicable a la fecha de corte; los informes anteriores permanecen congelados. También puede registrarse en casos con TAR intramuscular, sin afirmar que se ha administrado una inyección.

Validación adicional: `pruebas/registro-manual.test.mjs` y `pruebas/registro-manual.mjs`. El recorrido de navegador prueba dos medicamentos orales y dos intramusculares con fichas CIMA sintéticas interceptadas, registro manual, duplicados/conflictos, persistencia, informes y móvil. No verifica el catálogo real ni valida clínicamente las combinaciones. No se añaden dependencias ni se requiere migración destructiva del almacenamiento.

## Confianza en datos y gestión de señales

Las vistas aplican el corte a tratamiento, nivel, visitas, valoraciones, actuaciones y comunicaciones. Los hechos incluyen el día de corte; el cálculo de cobertura lo excluye. Si un dato antiguo carece de fecha efectiva, se indica y se usa su fecha de registro como referencia, sin reconstruir una fecha clínica inexistente.

En **Cobertura TAR → Dispensaciones y correcciones**, **Corregir / anular** conserva el original y añade motivo y sustitución opcional. Se recalculan las vistas actuales, no los informes guardados. La entrada manual y CSV concilian las coincidencias ambiguas antes de guardar; el CSV opcional de seis columnas incorpora `origen;id_origen` para distinguir entregas legítimas del mismo día.

En **Resumen → Gestionar: regla**, registre revisión, justificación, actuación vinculada o cierre con motivo. La condición calculada permanece separada de su gestión. Los datos efectivos, reglas o intervalo nuevos requieren revisión nueva; volver a dibujar la pantalla no reabre señales. Los avisos metodológicos se separan de los pendientes asistenciales/de calidad de datos en contadores y filtros.

Véase `docs/CONFIANZA_DATOS.md` para las decisiones temporales, compatibilidad, límites de reconstrucción, pruebas y recorrido de revisión. No se cambian umbrales ni se añaden servicios o dependencias.

## Consulta guiada y seguimiento

**Iniciar consulta guiada** permite revisar el contexto, vincular o recoger experiencia y valoración manual, acordar un problema/objetivo y crear o vincular una actuación con responsable funcional y fecha de revisión. Los cuatro pasos se guardan conjuntamente; cancelar no añade registros parciales.

La nueva ruta **Consulta y seguimiento** muestra planes activos, vencidos al corte, próximos y cerrados, filtrados por responsable. **Registrar seguimiento** distingue la ejecución de la actuación del resultado del objetivo. Cerrar exige resultado y fundamento; no se marcan intervenciones realizadas automáticamente. Son responsables funcionales simulados, sin asignación a usuarios ni comunicaciones reales.

Los planes y seguimientos conservan sus eventos e informes y respetan el corte. Los ejemplos nuevos declaran fechas efectivas para que no dependan del día en que se generan; los casos ya guardados se conservan sin cambios. Véase `docs/CONSULTA_SEGUIMIENTO.md` para recorrido, decisiones, pruebas y límites.
