# Limitaciones y requisitos para un futuro piloto clínico

Estado 0.3.0, 08/11/2026. Material de demostración con datos sintéticos. Autor: Dr. Ramón Morillo Verdugo.

## Límites actuales

No hay evidencia de validación clínica del algoritmo ni de sus reglas. Ni las pruebas unitarias ni la paridad con otra calculadora constituyen validación clínica. Umbral/ventana son parámetros demostrativos heredados. Las dificultades referidas disparan revisión, no diagnóstico de reacción adversa o falta de adherencia. No se asigna automáticamente el nivel CMO ni se modifica tratamiento.

Solo se admite TAR oral con un episodio activo. Los ejemplos iniciales tienen etiquetas ficticias; los episodios nuevos pueden seleccionar medicamentos reales de catálogo CIMA para casos siempre sintéticos. Cada registro CIMA es una unidad dispensable, sin deducir dosis ni equivalencias. El filtro de ATC/vía no valida un régimen completo ni su adecuación. Las instrucciones del paciente se redactan manualmente y exigen revisión; no son una prescripción. No modela TAR de acción prolongada, ingresos, interrupciones, fallecimiento, pérdidas de medicación, cambios parcialmente superpuestos, recetas externas o stock inicial. Nuevos datos pueden modificar la evaluación actual; los informes fijados permanecen independientes. La demostración permite ahora correcciones de filas por anulación/sustitución y conciliación explícita, sin sobrescribir originales; véase CONFIANZA_DATOS.md. Esto no es una auditoría institucional protegida.

La biblioteca declara acumulación por nivel y discrepancia pendiente con la herramienta original. No se han comprobado las anclas contra el PDF SEFH. No se reproduce una escala PAM ni se calcula una puntuación protegida o no autorizada.

El almacenamiento local y la validación del navegador pueden ser alterados por un usuario con acceso al equipo. Los eventos anexados protegen de edición accidental por la interfaz, no de manipulación deliberada. No existen firma, registro inmutable institucional, control de acceso, cifrado de datos de aplicación, copia de seguridad o bloqueo de sesiones. El servidor de desarrollo expone archivos estáticos; no debe usarse como servicio clínico en producción. El JSON es un formato técnico propio, no un documento FHIR validado. La comunicación es exclusivamente una máquina de estados local: no demuestra entrega ni lectura por un destinatario.

## Condiciones previas al piloto

1. Definir finalidad de uso, responsable clínico, población, exclusiones y circuito asistencial con Farmacia e Infecciosas. Revisar clasificación regulatoria, necesidad de evaluación ética y requisitos aplicables con responsables institucionales.
2. Aprobar clínicamente denominador, ventana, umbrales por pauta, arrastres, cambios de TAR, interrupciones, componentes, fuentes externas y tratamiento de datos ausentes. Documentar versión, justificación y proceso de cambio. Estudio de sensibilidad y falsos positivos/negativos; protocolo de validación con referencia profesional independiente.
3. Contrastar guion y catálogo con documentos originales y obtener permisos necesarios de uso/redistribución. Resolver catálogo acumulativo/nivel propio. Definir instrumentos de experiencia del paciente autorizados y, si procede, validados.
4. Evaluación de impacto de protección de datos, base jurídica, minimización, retención, gestión de derechos, roles y accesos institucionales. Separar entornos y datos de pruebas. Impedir datos reales hasta autorización expresa del centro.
5. Backend institucional con SSO, RBAC, autorización por caso y operación, TLS, almacenamiento y copias cifrados, auditoría protegida, trazabilidad de actor/fecha, concurrencia, idempotencia, validación de esquemas, migraciones y recuperación probada. No reutilizar localStorage para historias clínicas.
6. Contratos de interoperabilidad autorizados: identidad institucional, Patient/MedicationRequest/MedicationDispense/CarePlan/Communication según perfiles acordados, terminologías versionadas, conciliación y procedencia. No equiparar un cambio manual de estado con un acuse real.
7. Seguridad: modelo de amenazas, revisión de dependencias, pruebas de autorización, XSS/CSRF e importación, pruebas de carga y accesibilidad formal. La CSP y el escape del MVP solo cubren una parte.
8. Protocolo de respuesta a señales, tiempos y responsables, escalado, comunicación, revisión profesional registrada y cierre. Evitar fatiga de alertas. Pruebas de usabilidad con profesionales y pacientes, accesibilidad WCAG 2.2 AA y evaluación de comprensión.
9. Definir métricas, seguimiento de incidentes, monitorización, soporte, control de versiones y criterios de pausa del piloto. Comparar cobertura con fuentes y resultados apropiados sin inferir causalidad ni adherencia efectiva a partir de dispensaciones.

Ninguna de estas condiciones se declara cumplida por esta entrega. No hay conexión a datos clínicos reales ni autorización para su uso en pacientes.

## Ampliación 0.2

Revisar el filtro de catálogo y su mantenimiento con fuentes oficiales, resolver excepciones y verificar CORS/disponibilidad desde el origen institucional. CIMA no aporta datos de dispensación, pauta, validación terapéutica ni persistencia del catálogo histórico; se mantiene la instantánea de cada consulta. En esta sesión el acceso en vivo está bloqueado por política de red; los contratos se probaron con respuestas sintéticas.

La hoja del paciente requiere gobernanza de las instrucciones, accesibilidad del documento, lenguaje comprensible y validación profesional de cada pauta. No se han validado comprensión en pacientes, impresoras físicas, lectores PDF diferentes o firma documental. Antes de uso clínico deben establecerse emisor/roles reales y circuito de entrega. El botón de copia requiere revisión del texto y autorización institucional; no constituye integración de historia clínica.

El recurso MAPEX-ADHEFAR Hub es externo y complementario. Revisar con el equipo qué materiales son apropiados y las condiciones de uso; enlazarlo no valida clínicamente vihconectados.

## Ampliación 0.3 · Información legal y acceso futuro

Las páginas legales describen el estado de demostración y no acreditan cumplimiento RGPD, validación clínica, aval de SEFH, cesión formal o conformidad WCAG. El titular de explotación, contacto institucional, DPD y acuerdos deben definirse antes de un servicio real. Se mantiene la autoría del Dr. Ramón Morillo Verdugo y los derechos de las fuentes.

La portada no es una barrera de seguridad: se entra libremente a la demo sin credenciales. No hay altas ni recogida de contraseñas. Las cuentas por hospital están solo diseñadas; las pruebas de aislamiento y autorización del futuro servidor son condición previa al piloto. Véase ACCESO_HOSPITALARIO.md. Nunca compartir una contraseña por hospital ni reutilizar localStorage como almacén institucional.

Los casos nuevos pueden partir de escenarios longitudinales. Actualizar la cohorte es aditivo e idempotente; no transforma datos o informes previos. Todas las etiquetas y eventos de ejemplo son sintéticos y no sustituyen datos clínicos de validación.
