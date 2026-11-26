# COMUNICACION_PROFESIONALES — Solicitudes de valoración entre Farmacia e Infecciosas

| | |
|---|---|
| Estado | **Prototipo local.** Modela el circuito; no comunica nada a nadie |
| Fecha | 2026-11-26 |
| Qué se decidió | Primera pieza funcional de la herramienta (decisión del autor, 2026-11-26): solicitud de valoración, prototipo local, ciclo de 4 estados |
| Qué NO se afirma | Que sustituya un canal de comunicación asistencial real, ni que los plazos o criterios sean clínicamente adecuados |

## 1. Qué hace
Un profesional **pide** a otro que valore un caso (con motivo, plazo y, opcionalmente, la señal a la que se refiere) y el circuito deja constancia de cada paso.

```
 ORIGEN ──envía──► [enviada] ──DESTINO acusa──► [recibida] ──DESTINO responde (texto)──► [respondida] ──ORIGEN cierra──► [cerrada]
```
- Cada paso es un **evento nuevo** (`solicitud_valoracion`, `estado_solicitud`); nada se reescribe.
- Solo el **destino** recibe y responde; solo el **origen** cierra. Orden estricto: no se salta ningún paso.
- La respuesta es obligatoria (1–1000 caracteres) al pasar a «respondida». El motivo es obligatorio (1–500).
- «Plazo vencido» se **deriva** de la fecha de corte (corte > plazo y sin responder). No genera avisos.
- Respeta la fecha de corte: antes del envío, la solicitud no existe.

## 2. Dónde está en la aplicación
- Ficha del caso (Resumen): botón **Solicitar valoración** y lista de solicitudes de ese caso.
- Menú **Solicitudes entre profesionales**: selector «Trabajo como» y tres listas (**Me toca**, **Esperando a la otra parte**, **Cerradas**).

## 3. Dónde está en el código
| Pieza | Fichero |
|---|---|
| Reglas del ciclo, estado, bandeja | `src/solicitudes.js` (dominio puro) |
| Esquemas de los dos eventos | `src/esquemas-eventos.js` |
| Validación al guardar | `src/almacen.js` (`anexar`) |
| Constructores de eventos de formulario | `src/eventos-formulario.js` |
| Pantallas y formularios | `src/vista-solicitudes.js` (todo dato se escapa) |
| Pruebas | `pruebas/solicitudes.test.mjs` (13 de dominio, contrastadas por mutación), `pruebas/solicitudes.mjs` (ciclo completo en navegador) |

## 4. Límites (dato objetivo)
| Limitación | Consecuencia |
|---|---|
| **El perfil lo declara quien usa la herramienta** | No es autenticación: cualquiera puede actuar como cualquier perfil |
| **Un solo navegador, un solo almacenamiento** | Dos profesionales reales no pueden usarla a la vez desde sus equipos |
| **Sin avisos ni mensajes** | El destinatario no se entera si no abre la bandeja |
| **Sin actor identificado ni reloj de servidor** | El registro dice «Infecciosas», no quién |
| **Sin criterios clínicos** | No dice cuándo conviene pedir una valoración ni en qué plazo |
| Solo dos perfiles | Enfermería y otros roles no existen (A17) |

## 4bis. Por qué es un prototipo
Una comunicación real entre dos personas necesita un **servidor compartido**, cuentas, permisos y evaluación de protección de datos (B01 a B03, C03). El prototipo permite **ensayar el flujo con el equipo en una misma pantalla** y decidir qué se necesita antes de construir eso.

## 5. Decisiones abiertas
**D-G18** (`DECISIONS_REGISTER.md`): para qué situaciones se piden, quién responde, plazo máximo y canal real de aviso. Hasta que el comité lo decida, el formulario no ofrece plazos ni motivos por defecto.

## 6. Qué viene después (si se confirma el valor del flujo)
1. Probarlo con el equipo en sesión conjunta y recoger qué falta.
2. Enlazar la solicitud con un plan de consulta y con la señal gestionada.
3. Cuentas y servidor (B01 a B03) con el hospital piloto.
