# vihconectados
## Manual de uso para Farmacia Hospitalaria e Infecciosas

**Cómo registrar, interpretar y seguir un caso de demostración.**

Autor de la herramienta: **Dr. Ramón Morillo Verdugo**.

Edición del manual: **9 de noviembre de 2026**. Aplicación v0.3.0, con consulta guiada y seguimiento.

**Solo casos sintéticos.** La versión descrita es una demostración local. No es un sistema de prescripción ni un producto clínicamente validado. No introduzca datos reales ni credenciales.

### Qué permite hacer

Revisar cobertura teórica del TAR oral, registrar experiencia y valoración manual de adherencia, seleccionar medicamentos de CIMA, documentar actuaciones y acordar un plan con responsable funcional, fecha de revisión y resultado. También permite generar informes y simular su comunicación.

### Qué conviene recordar desde el principio

- Retirada, cobertura teórica y valoración de adherencia son conceptos distintos.
- Una actuación realizada no demuestra que el objetivo se haya alcanzado.
- Cambiar el estado de un informe no envía ni recibe una comunicación real.
- Las vistas actuales se reconstruyen con las correcciones disponibles; los informes guardados conservan su instantánea.

### Contenido

| Página | Apartado |
| --- | --- |
| 2 | Primer acceso, navegación y recorrido rápido |
| 3 | Fecha de corte, cobertura y adherencia |
| 4 | Casos, selección de medicamentos y TAR intramuscular |
| 5 | Dispensaciones manuales, CSV y conciliación |
| 6 | Correcciones y gestión de señales |
| 7 | Consulta guiada: los cuatro pasos |
| 8 | Seguimiento del plan y bandeja de tareas |
| 9 | Informes, hoja del paciente y comunicaciones |
| 10 | Recorridos por perfil y ejemplo completo |
| 11 | Problemas frecuentes, conservación de datos y límites |

<!-- pagina -->
# 1. Primer acceso y recorrido rápido

### Entrar

En la portada pulse **Entrar en la demostración**. No se necesita registro ni contraseña. La primera apertura carga tres casos sintéticos y sitúa la fecha de corte inicial en **2026-11-08**; esta fecha no avanza automáticamente con el calendario.

Si ejecuta una copia local, requiere Node.js 22 o superior: desde la carpeta del proyecto ejecute `npm start` y abra la dirección local indicada por su entorno, en el puerto 5173 por defecto. La web publicada puede abrirse directamente desde su dirección habitual, sin instalar Node.js.

### Dónde encontrar cada función

| Pantalla | Para qué sirve |
| --- | --- |
| Panel de seguimiento | Resumen clásico de casos, señales, actuaciones, comunicaciones y enlace a planes activos. |
| Estación de seguimiento | Monitorización y cohorte con búsqueda y filtros; acceso a ficha e intervención CMO. |
| Casos sintéticos | Abrir casos, crear uno nuevo o añadir escenarios que falten sin borrar los existentes. |
| Consulta y seguimiento | Revisar planes por plazo, responsable funcional y estado. |
| Comunicaciones | Consultar informes y avanzar sus estados simulados. |
| Modelo y reglas | Consultar límites, parámetros demostrativos y exportar la demostración en JSON. |
| Recursos de adherencia | Abrir materiales externos complementarios, sin enviar el contexto del caso. |

Dentro de un caso encontrará **Resumen**, **Consulta y plan**, **Historia longitudinal**, **Cobertura TAR**, **Experiencia**, **Intervenciones CMO** e **Informes**. Panel y Estación muestran los mismos datos locales con distinta presentación.

### Un primer recorrido en diez minutos

1. Abra **DEMO-001** y compruebe la fecha de corte.
2. Revise tratamiento, cobertura y última experiencia. Lea las señales y sus límites.
3. Abra **Cobertura TAR** para ver el periodo y las dispensaciones.
4. Pulse **Iniciar consulta guiada** y acuerde un objetivo y una actuación sintéticos.
5. Elija responsable funcional y revisión; guarde el plan.
6. Abra **Consulta y seguimiento** y localice el plan con los filtros.
7. Registre después un seguimiento con resultado y fundamento.
8. Genere un informe profesional y compruebe qué información queda fijada.

Los botones **Guardar registro** anexan información. Cerrar la consulta guiada antes de guardar no deja registros parciales.

<!-- pagina -->
# 2. Interpretar fechas, cobertura y adherencia

### Tres lecturas distintas

| Concepto | Qué muestra la herramienta | Qué no demuestra |
| --- | --- | --- |
| Retirada o dispensación | Fecha y días de suministro registrados por medicamento. | Que el medicamento se haya tomado. El retraso respecto a una cita de recogida no se calcula. |
| Cobertura teórica, PDC | Días con disponibilidad registrada del TAR oral completo divididos entre días orales evaluables. | Ingesta, control virológico o adecuación de la pauta. |
| Valoración manual de adherencia | Método, periodo, resultado referido y porcentaje opcional declarado. | Una confirmación objetiva de toma por entrevista, autoinforme o cuestionario. |

**PDC = días cubiertos / días evaluables.** En pautas orales de varios medicamentos, un día solo cuenta como cubierto si están disponibles todos los componentes. No se promedian sus porcentajes.

Ejemplo sintético: en 30 días, un medicamento cubre 30 y el otro solo los primeros 20. El TAR completo tiene 20/30 días cubiertos: **66,7 %**, no 83,3 %. Un 0 % indica ausencia de cobertura registrada, no incumplimiento demostrado; un 100 % tampoco acredita toma.

### Cómo funciona la fecha de corte

Los hechos con fecha efectiva igual o anterior al corte pueden mostrarse. El cálculo de cobertura usa **[inicio, corte)**: el día del corte queda excluido. Por ejemplo, un corte en 2026-11-08 llega hasta el final del día 7. Un tratamiento que empieza el día 8 puede figurar como vigente, pero aún no aporta días a la cobertura anterior.

- **Fecha efectiva:** cuándo ocurre o tiene efecto un hecho.
- **Fecha de registro:** cuándo se guardó en la aplicación.
- Si un registro antiguo carece de fecha efectiva, se indica y se usa su fecha de registro como referencia. Si no tiene ninguna, no se atribuye a un periodo histórico. Un nivel puede aparecer como **sin dato** al retroceder el corte.

Las vistas reconstruyen el pasado con la información y correcciones disponibles actualmente. No reconstruyen exactamente todo lo que se sabía en aquel momento. Para eso, conserve las instantáneas de informes ya guardados.

### Parámetros y límites

La ventana inicial de 180 días y el parámetro de señal del 90 % son **demostrativos y pendientes de validación**. No son un diagnóstico ni una regla para cambiar TAR. El modelo no incorpora ingresos, suministro externo, reservas iniciales, suspensiones o pérdidas de medicación. Estos límites deben tenerse presentes al interpretar el resultado.

<!-- pagina -->
# 3. Casos y medicamentos desde CIMA

### Crear o abrir un caso

Pulse **+ Nuevo caso sintético**, elija caso en blanco o escenario y guarde. El identificador DEMO se genera automáticamente. En los escenarios, los niveles y tratamientos iniciales son ficticios. Los ejemplos A/B/C/D no se convierten automáticamente en medicamentos reales.

En **Casos sintéticos**, **Añadir casos actualizados** aparece cuando faltan escenarios. Añade los que correspondan sin sustituir casos o informes existentes. No borre el almacenamiento para actualizar la cohorte.

### Registrar TAR de uno o varios medicamentos

1. En **Resumen**, pulse **Registrar cambio TAR**.
2. Indique la fecha de inicio del nuevo episodio.
3. Escriba solo el nombre de un medicamento o principio activo y pulse **Buscar en CIMA**.
4. Abra un resultado, revise su ficha y seleccione una presentación comercializada.
5. Pulse **Añadir al TAR**.
6. Para una combinación, pulse **+ Añadir otro medicamento** y repita. La selección anterior se conserva.
7. Revise todas las presentaciones y vías. Confirme que representan el TAR completo del caso sintético y guarde.

Se admiten hasta **ocho medicamentos distintos** por episodio. Un mismo registro CIMA no puede repetirse. Cambiar la selección exige volver a confirmar la revisión. La consulta del catálogo no valida indicación, dosis, interacciones ni adecuación de la combinación.

Un nuevo episodio conserva los tratamientos anteriores y cierra el anterior para el cálculo. No traslada sobrantes entre episodios, incluso si el cambio es de presentación. No se admiten inicios anteriores o iguales al último inicio registrado.

### TAR intramuscular

Se pueden seleccionar presentaciones intramusculares admitidas por el filtro de catálogo, incluidas las correspondientes a una combinación como **Vocabria + Rekambys**, cuando CIMA devuelve fichas válidas. Revise la vía de cada presentación: no mezcle una fase oral y una intramuscular en el mismo episodio.

El registro intramuscular es **de catálogo**. No registra administraciones, no calcula ventanas de inyección ni transforma envases en días. Sus periodos se excluyen del numerador y denominador del PDC oral. Si solo hay periodo intramuscular, el PDC oral no es aplicable; no se muestra como un falso 0 %. Puede registrar una valoración manual independiente.

CIMA solo recibe búsquedas e identificadores de medicamento; no recibe el caso. Si no responde o faltan datos requeridos, no se inventa una ficha. No cambie un tratamiento para eludir el filtro.

<!-- pagina -->
# 4. Dispensaciones, CSV y conciliación

### Entrada manual

Desde **Resumen** o **Cobertura TAR**, pulse **Registrar dispensación manual**. Elija episodio oral y fecha; indique días de suministro por medicamento. Deje vacíos los medicamentos que no se dispensaron. Los días deben ser enteros entre 1 y 400; no se deducen del envase ni de una dosis supuesta.

Si dispone de identificadores técnicos sintéticos, indique origen e identificador por medicamento. Se aportan juntos. No use nombres, NHC, CIP u otros datos personales en esos campos.

### Importación CSV

1. Descargue **CSV de ejemplo** desde el caso para obtener su episodio y componentes correctos.
2. Prepare el archivo con separador punto y coma y fechas `AAAA-MM-DD`.
3. Pulse **Importar CSV** y seleccione el archivo o pegue su contenido.
4. Revise los errores o coincidencias y guarde cuando la entrada sea válida.

Esquema clásico:

```csv
fecha;episodio;componente;dias
2026-11-01;UUID_DEL_EPISODIO;A;30
```

`UUID_DEL_EPISODIO` es un marcador explicativo: sustitúyalo por el valor de la plantilla. En episodios CIMA los componentes tienen formato `CIMA-<nregistro>`; no use A salvo que corresponda a un ejemplo sintético A.

Esquema ampliado opcional:

```csv
fecha;episodio;componente;dias;origen;id_origen
2026-11-01;UUID_DEL_EPISODIO;A;30;SISTEMA-DEMO;DISP-001
```

Límites: 100 KB y 1.000 filas. No se admiten columnas libres, campos entrecomillados ni separadores dentro de campos. La fecha y el componente deben pertenecer al episodio. Los errores bloquean el lote antes de guardar.

### Cuando aparece «Conciliar coincidencias»

La coincidencia de día, episodio y medicamento no demuestra duplicación. Seleccione **Es duplicado de esta referencia: no añadir** o **Es otra dispensación legítima: añadir**, e indique motivo sintético. Nada se guarda mientras queden decisiones pendientes. La decisión se conserva aunque se omitan todas las filas.

La misma identidad de origen y contenido permite reconocer una reimportación. Si esa identidad llega con datos distintos, debe corregirse el registro existente. También se reconoce un archivo ya guardado por su huella y filas normalizadas. Sin identidad suficiente puede ser necesaria una conciliación, incluso con cantidades iguales.

<!-- pagina -->
# 5. Correcciones y gestión de señales

### Corregir una dispensación

Abra **Cobertura TAR → Dispensaciones y correcciones** y localice la fila. Pulse **Corregir / anular**:

1. Elija sustituir por un registro corregido o anular sin sustitución.
2. Para sustituir, revise fecha, episodio, componente y días.
3. Escriba el motivo sintético y guarde.
4. Si coincide con otra entrega vigente, confirme expresamente que son dispensaciones independientes, después de comprobarlo.

El original permanece como **sustituida** o **anulada**; la sustitución, si existe, queda vigente y enlazada. Solo las filas vigentes aportan cobertura. Una sustitución puede corregirse de nuevo; un original ya retirado no vuelve a anularse. Los informes guardados no se recalculan.

Esta corrección se aplica a dispensaciones. No es un editor general para borrar o reescribir cualquier visita, tratamiento o plan.

### Leer las señales

La herramienta distingue **avisos metodológicos**, **calidad de datos** y **señales asistenciales**. Los avisos, por ejemplo que un periodo intramuscular no entra en el PDC oral, no se cuentan como pendientes asistenciales. La mesa y los contadores se centran en pendientes asistenciales o de calidad; los filtros de cohorte permiten consultar avisos y señales gestionadas.

### Gestionar una señal

En **Resumen**, pulse **Gestionar: regla**. Seleccione estado e indique motivo. Si elige el estado actuación, vincule una actuación existente aplicable al corte.

| Gestión | Lectura operativa |
| --- | --- |
| pendiente | La evidencia actual aún no tiene una gestión individual aplicable. |
| revisada | Se ha documentado la revisión. |
| justificada | Se ha documentado una explicación con su motivo. |
| actuacion | Se ha vinculado una actuación; esto no significa que esté realizada. |
| cerrada | Se ha cerrado la gestión de esa evidencia, con motivo. |

La condición calculada puede permanecer después de revisar o cerrar su gestión. Si cambian los datos efectivos, correcciones, intervalo o reglas, puede requerir revisión nueva. Recargar la pantalla sin esos cambios no la reabre. Las revisiones globales antiguas se conservan sin inventar un vínculo individual con cada señal.

Cerrar una señal no cierra un plan ni resuelve un informe de comunicación: son objetos independientes.

<!-- pagina -->
# 6. Consulta guiada: los cuatro pasos

Pulse **Iniciar consulta guiada** desde el caso. Cada plan contiene un problema y un objetivo; puede registrar otros planes independientes para el mismo caso.

### Paso 1. Revisar el contexto

Compruebe fecha efectiva, TAR, nivel y cobertura del corte. Lea los límites y confirme que ha revisado el contexto. Si no hay intervalo oral evaluable o hay periodos intramusculares excluidos, no interprete la ausencia de PDC como falta de toma.

### Paso 2. Experiencia y valoración

Elija vincular la última experiencia aplicable, si existe, o registrar una nueva. La reutilización no duplica la visita. Si no existe experiencia y no registra una nueva, el vínculo queda vacío: no se inventa una entrevista.

Las opciones recogen barreras, dificultad, efectos referidos, carga percibida y preferencia de seguimiento. No son por sí mismas una escala validada. Al recoger una experiencia nueva, revise sus campos en vez de asumir que la visita anterior describe la situación actual.

Opcionalmente marque registrar valoración manual de adherencia. Indique inicio y fin del periodo, método, resultado referido y porcentaje si dispone de una estimación documentable. El final se excluye y no puede superar la fecha de evaluación. El porcentaje puede quedar vacío; cero y no estimado no son equivalentes. Este registro no modifica el PDC.

También puede registrar experiencia o adherencia por separado desde las secciones habituales del caso.

### Paso 3. Problema, objetivo y actuación

Seleccione el problema principal y escriba qué se pretende conseguir y cómo se comprobará. Cree una actuación pendiente o vincule una existente. La biblioteca CMO ofrece textos opcionales por nivel; no selecciona automáticamente la intervención adecuada.

Ejemplo sintético: problema «Acceso a la dispensación»; objetivo «Comprobar en la revisión si se ha podido realizar la recogida acordada»; actuación «Revisar las barreras de acceso y acordar un circuito de recogida». Es un ejemplo de documentación, no una pauta clínica.

### Paso 4. Acordar seguimiento

Elija responsable funcional y fecha de revisión igual o posterior a la consulta. Revise el resumen y confirme el plan. Los responsables disponibles son Farmacia Hospitalaria, Infecciosas y equipo compartido; son funciones simuladas, no usuarios a quienes se envíe una tarea real.

**Anterior / Siguiente** conservan los campos. Solo la confirmación final guarda el conjunto de registros. Cancelar o fallar la validación no deja un plan parcial. Crear una actuación nueva la deja pendiente; el objetivo queda pendiente de evaluar.

<!-- pagina -->
# 7. Seguimiento y bandeja de planes

### Localizar el siguiente paso

Abra **Consulta y seguimiento**. Puede filtrar por responsable funcional y plazo: planes activos, revisión vencida, para la fecha de corte, próxima, cerrados o todos. El orden es cronológico, no una clasificación automática de riesgo.

La referencia es **el corte visible**, no necesariamente la fecha de hoy. Si un plan se revisa el 2026-11-10: con corte el día 9 es próximo; el día 10 está para el corte; el día 11 está vencido si continúa abierto. Estos estados no envían recordatorios ni cambian el plan por sí solos.

### Registrar seguimiento

1. Pulse **Registrar seguimiento** en el caso o en la bandeja.
2. Compruebe fecha efectiva y elija mantener el plan en curso o cerrarlo.
3. Indique resultado del objetivo y observaciones que lo fundamenten.
4. Si sigue en curso, acuerde responsable y próxima revisión.
5. Marque la confirmación de actuación realizada solo cuando corresponda.
6. Guarde y compruebe el estado que aparece al corte.

Resultados disponibles: pendiente de evaluar, objetivo alcanzado, parcialmente alcanzado, no alcanzado o no evaluable. Para cerrar debe escoger un resultado distinto de pendiente y justificarlo. El cierre deja sin próxima revisión a ese plan.

### Actuación y objetivo se evalúan por separado

| Situación | Registro coherente |
| --- | --- |
| Se realizó una llamada, pero aún no se conoce su efecto. | Actuación realizada; objetivo pendiente de evaluar; plan en curso. |
| Hay mejoría parcial y se acuerda comprobarla después. | Resultado parcialmente alcanzado y nueva revisión. |
| No se dispone de información suficiente para concluir. | Resultado no evaluable y fundamento; decidir expresamente si continuar o cerrar. |

No marque «objetivo alcanzado» solo porque se realizó una intervención. Cerrar un plan tampoco marca automáticamente su actuación como realizada.

La historia del plan conserva consulta, vínculos y seguimientos. Un seguimiento no puede preceder a la consulta ni al último registrado. Si hay seguimientos posteriores al corte, avance el corte para añadir otro. En esta versión un plan cerrado no se reabre: un acuerdo nuevo se documenta mediante otra consulta.

<!-- pagina -->
# 8. Informes y comunicaciones

### Informe profesional

En el caso pulse **Generar informe simulado**. Se guarda una instantánea con corte, reglas, cobertura, señales, experiencia, actuaciones y planes aplicables. Los registros o correcciones posteriores no cambian ese informe: si necesita reflejarlos, genere uno nuevo.

- **Ver e imprimir:** abre la composición preparada para impresión. En **Imprimir / PDF**, seleccione guardar como PDF, papel A4 y desactive las cabeceras y pies del navegador.
- **Copiar para historia clínica:** genera texto por apartados. Si el portapapeles no está disponible aparece una alternativa manual. La aplicación no escribe en ninguna historia clínica. No pegue casos ficticios en una historia real.
- **Descargar JSON:** conserva la representación técnica del informe; no es un PDF firmado ni un recurso de interoperabilidad validado.

### Hoja para el paciente

**Crear hoja para el paciente** permite redactar instrucciones sintéticas revisadas, indicar próxima cita opcional e incluir un recurso complementario. Exige confirmación de revisión. No genera dosis ni pauta a partir de CIMA. La hoja conserva la medicación y acuerdos tal como estaban al crearla y no participa en los estados del informe para Infecciosas.

### Circuito de comunicación simulado

Los informes profesionales avanzan por **pendiente → comunicado → recibido → valorado → resuelto**. Cada transición deja rastro y debe respetar las fechas. Los botones de simulación no acreditan envío, entrega, lectura o respuesta de otro profesional.

| Objeto | Qué significa cambiar su estado |
| --- | --- |
| Señal | Documentar cómo se gestionó una evidencia calculada. |
| Actuación | Documentar si la acción se realizó. |
| Plan de consulta | Documentar seguimiento y resultado del objetivo. |
| Informe profesional | Simular su circuito de comunicación. |

Ninguno de estos cambios actualiza automáticamente los demás. Por ejemplo, un informe resuelto no cierra el plan del paciente ni acredita que una actuación se realizara.

### Información que aún falta para una coordinación real

No hay cuentas personales, permisos por hospital, mensajes, historia clínica conectada, resultados virológicos ni agenda externa. La herramienta permite ensayar el circuito y revisar documentos, pero no sustituye los sistemas asistenciales autorizados.

<!-- pagina -->
# 9. Recorridos por perfil y ejemplo completo

### Perspectiva de Farmacia Hospitalaria

1. Compruebe caso y corte; revise tratamiento y calidad de los datos de dispensación.
2. Registre o importe suministros orales. Concilie coincidencias y corrija errores antes de interpretar la cobertura.
3. Explore barreras y experiencia, separándolas del PDC.
4. Revise las señales y documente su gestión con motivo.
5. Acuerde un problema, objetivo y actuación mediante la consulta guiada.
6. Revise la bandeja y registre después ejecución y resultado, sin confundirlos.

### Perspectiva de Infecciosas

1. Revise tratamiento, periodo de cobertura y sus límites. La herramienta no aporta carga viral o CD4 ni valida la pauta.
2. Lea la experiencia, valoración manual y motivo de la actuación. Identifique qué objetivo se pretende comprobar.
3. Consulte planes asignados a la función Infecciosas o equipo compartido y su revisión acordada.
4. Documente el seguimiento sintético, resultado y siguiente paso. La función seleccionada no equivale a una cuenta real ni a una tarea enviada.
5. Revise el informe profesional y su fecha antes de utilizar su contenido en el ensayo del circuito.

### Ejemplo de principio a fin

**Escenario ficticio, sin recomendación clínica.** En una copia de demostración, cree un caso independiente y registre TAR oral. Para evitar confundir fechas, mantenga visible el corte durante todo el ejercicio.

- **8 de noviembre de 2026:** registre una dispensación y una experiencia con barrera de acceso. No concluya falta de toma a partir del PDC. Inicie consulta guiada; acuerde un objetivo verificable, una actuación pendiente, responsable Farmacia Hospitalaria y revisión el día 10.
- **Corte en el día 11:** el plan aparecerá vencido si sigue abierto. Registre que se realizó la actuación, pero que el objetivo está parcialmente alcanzado. Manténgalo en curso y acuerde una revisión el día 15.
- **Corte en el día 15:** documente el resultado disponible y su fundamento. Si procede cerrar el plan, elija cierre y resultado explícito. No suponga que la herramienta confirma el resultado clínico.
- **Comparación:** genere un informe antes y otro después del seguimiento. El primero conserva la situación previa; el segundo refleja el nuevo corte. Retroceda el corte para comprobar la lectura histórica del plan.

Para empezar sin configurar medicamentos puede explorar los escenarios existentes: DEMO-001 (barreras de acceso), DEMO-002 (cambio de TAR) y DEMO-003 (cobertura multicomponente). Sus tratamientos son etiquetas sintéticas, no prescripciones.

<!-- pagina -->
# 10. Dudas frecuentes y conservación de datos

### «No aparece el registro que acabo de guardar»

Compruebe la fecha efectiva y el corte. Un hecho posterior no debe aparecer como ya ocurrido. Si hay seguimientos más recientes, la vista histórica limita la modificación. «Sin dato» puede indicar que un registro antiguo no tenía fecha efectiva aplicable, no que se haya borrado.

### «No puedo guardar una combinación o dispensación»

Revise vías y presentación de CIMA; no mezcle fases orales e intramusculares en un episodio. Para suministros, compruebe fecha dentro del episodio, componente y días enteros 1–400. Si hay coincidencias, complete la conciliación. No cambie datos arbitrariamente para superar un error.

### «He cerrado una señal y continúa el aviso»

La condición calculada y su gestión son independientes. Lea su estado de gestión. Cambiar datos efectivos, intervalo o reglas puede exigir revisión nueva. Un aviso metodológico tampoco implica por sí solo un problema clínico.

### «El informe no muestra una corrección reciente»

Es una instantánea guardada. Genere otro informe para reflejar la reconstrucción actual. No modifique el documento previo para hacer parecer que contenía información que aún no estaba recogida.

### Dónde se conserva la información

Los datos se guardan en el almacenamiento de ese navegador y origen. Otro dispositivo, perfil o dirección web puede no compartirlos. Borrar los datos del sitio o trabajar en una sesión privada que se cierre puede eliminar la demostración. No hay recuperación institucional ni sincronización multidispositivo.

En **Modelo y reglas → Exportar demostración JSON** puede descargar la información para revisión técnica. La exportación no equivale a una copia de seguridad con restauración comprobada: esta versión no ofrece importar el JSON como historial clínico. Conserve también los informes que necesite revisar. No use este almacenamiento para datos reales.

### Límites que condicionan el uso

No hay validación clínica del algoritmo, autenticación real, aislamiento hospitalario, firma electrónica, prescripción, integración con historia clínica, envío de comunicaciones ni control de administraciones inyectables. Los responsables de planes son funciones simuladas. La biblioteca CMO y los parámetros requieren revisión profesional; citar una fuente no implica aval institucional.

### Glosario y fuentes

**TAR:** tratamiento antirretroviral. **PDC:** proporción de días cubiertos por suministro registrado del TAR oral completo. **Episodio:** periodo de tratamiento registrado con identidad propia. **Corte:** fecha de referencia de las vistas. **Instantánea:** informe cuyo contenido queda fijado. **CMO:** Capacidad, Motivación y Oportunidad.

El manual describe funciones comprobadas en el código, no añade recomendaciones clínicas. Catálogo: CIMA, AEMPS. Biblioteca y guion CMO: fuentes atribuidas en la aplicación y en el repositorio, incluida SEFH. Consulte **Autoría y uso**, **Modelo y reglas** y [el repositorio vihconectados](https://github.com/ramonmorillo/vihconectados) para límites, atribuciones y futuras actualizaciones.
