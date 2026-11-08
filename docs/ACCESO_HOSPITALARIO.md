# Acceso individual por hospital — diseño de evolución

Versión 0.3.0. Esta es una propuesta de arquitectura, no un servicio habilitado ni una garantía de aislamiento actual.

## Estado actual

La portada pública ofrece una entrada directa a la demostración. La ruta `#panel` sigue accesible sin registro. `#hospitales` explica el futuro acceso sin recoger usuarios, contraseñas, correos, centros ni solicitudes de alta. No se han añadido servidor, Supabase, tablas de usuarios, secretos, contraseñas por defecto o cookies de sesión. No se presenta un selector de hospital como si protegiera los datos.

`src/acceso.js` define el punto de sustitución del proveedor de identidad. El adaptador actual devuelve exclusivamente un contexto de demostración sin usuario, hospital o roles, y rechaza iniciar sesión institucional. El contexto de interfaz no concede permisos. `RepositorioDemo` permanece separado del futuro repositorio institucional: no reutilizar localStorage para historias o contraseñas.

## Modelo previsto

- **Hospital:** ámbito organizativo con identificador estable y configuración propia, sin contraseña compartida.
- **Usuario:** identidad individual. Cada profesional tendrá su usuario y credencial propia, o un acceso institucional SSO; la activación concreta se acordará con cada centro.
- **Pertenencia:** relación explícita usuario–hospital, estado activo, rol y alcance. Un profesional puede tener varias pertenencias; seleccionar un centro no crea permisos.
- **Funciones previstas:** Farmacia (seguimiento/actuaciones/comunicaciones), Infecciosas (lectura autorizada y valoración/respuesta), gestor de hospital (altas/bajas/permisos). Los permisos finales deben aprobarse: ser gestor no debe conceder acceso clínico indiscriminado.
- **Administración de plataforma:** operación técnica separada de acceso clínico; acceso excepcional a datos solo por procedimiento autorizado y auditable.
- **Datos:** pacientes, episodios, eventos, informes y comunicaciones con `hospital_id` obligatorio; relaciones y restricciones compuestas que impidan referencias cruzadas entre centros.

## Identidad y sesiones

Contrato del futuro proveedor: `obtenerContexto()` obtiene identidad, pertenencias, hospital activo, permisos y caducidad desde una sesión verificada por servidor; `iniciarSesion()` delega en el proveedor institucional y `cerrarSesion()` revoca/invalida la sesión. El cliente no valida contraseñas ni firma su propio rol.

Para cuentas con usuario/contraseña: invitación o alta administrada, verificación, activación, recuperación y revocación; hash de contraseña por el proveedor/servidor con un algoritmo adecuado como Argon2id y parámetros revisados, nunca texto plano, hash en el navegador, credenciales en el repositorio o contraseñas de hospital compartidas. Prever MFA según el análisis de riesgos, bloqueo/rate limiting, sesiones con caducidad/inactividad y revocación de pertenencias. Evitar enumeración de cuentas. SSO institucional OIDC/SAML puede sustituir la gestión directa de contraseñas.

Preferir sesiones de servidor con cookies Secure/HttpOnly/SameSite, medidas CSRF y TLS; documentar la solución elegida. No guardar credenciales ni tokens de larga duración en localStorage. No se crea ahora un formulario que recoja contraseñas sin destino seguro.

## Autorización y aislamiento obligatorios en servidor

Cada lectura/escritura/exportación verificará identidad, pertenencia activa y permiso sobre el caso, además de hospital. No confiar en un `hospital_id` de la URL, cabecera arbitraria o JSON del navegador. Si se permite cambiar de centro, validar la pertenencia antes de emitir el contexto y vaciar cachés sensibles al cambio/cierre de sesión.

Las políticas de base de datos o filtros de repositorio deberán ser obligatorias, con denegación por defecto. Validar también IDs de episodios, actuaciones, informes y comunicaciones; no basta con filtrar el listado de pacientes. Los informes persistirán hospital, actor y versión de reglas/fuentes, sin modificar el histórico. Un cambio de estado de entrega necesitará un acuse real de la integración, no el botón de simulación.

Mantener auditoría protegida de accesos y cambios con usuario, pertenencia, hospital, recurso, acción y fecha; control de concurrencia e idempotencia; trazabilidad y corrección explícita de eventos. Definir copia de seguridad, recuperación, cifrado y custodia de claves, retención y minimización.

## Pruebas de aceptación antes de habilitarlo

1. Una cuenta del hospital A no puede leer, modificar o exportar recursos del B, ni cambiando IDs o enviando otro hospital en el payload. Incluir referencias anidadas y descarga de informes.
2. Un usuario sin pertenencia, desactivado o con sesión revocada no conserva acceso. Probar altas, recuperación, bloqueo y cambio de rol sin privilegios residuales.
3. Las funciones de Farmacia, Infecciosas y gestión se contrastan contra una matriz de permisos aprobada y pruebas de servidor, no contra botones ocultos.
4. Probar concurrencia, duplicación, auditoría, recuperación de copias y aislamiento de cachés/descargas. Revisión independiente de autenticación y autorización.
5. Completar responsable/encargado, DPD y soporte, base jurídica y EIPD cuando proceda; contratos y acuerdos con hospitales, condiciones institucionales, validación clínica y requisitos regulatorios aplicables.

No habilitar cuentas por cambiar una constante o añadir una pantalla de login. La publicación estática de GitHub Pages solo ofrece la demostración pública; un piloto necesita servicios e infraestructura autorizados.
