# Resumen ejecutivo — dónde estamos (2026-11-26)

> Una página. Todo lo demás está en `PRIORITIZED_BACKLOG.md` (detalle) y `DECISIONS_REGISTER.md` (decisiones).

## 1. Cómo verlo en 1 minuto
```bash
npm start            # abre http://localhost:5173
npm test             # 222 pruebas unitarias
```
En la aplicación, lo nuevo que se **ve**: (a) ficha de caso → pestaña *Informes* → botones **JSON completo / JSON mínimo**; (b) menú *Modelo y reglas* → tabla de reglas con versión y estado «Pendiente de validación»; (c) un TAR inyectable aparece como señal **«NO MONITORIZADO»** en vez de pasar desapercibido; (d) un aviso si hay datos guardados que no cumplen el esquema.

## 2. Qué se ha hecho (16 commits, 83 ficheros) — en lenguaje llano
| Hecho | Para qué sirve | Se ve en pantalla |
|---|---|---|
| A06 · Sin nivel CMO por defecto; inyectables visibles como «no monitorizado» | Evita que un caso parezca estable cuando no se está mirando | Sí |
| A04 · 26 casos de PDC calculados a mano | Comprobar que el cálculo es correcto | No (pruebas) |
| A03 · Registro de reglas versionado | Que ninguna regla diga «validada» sin aprobación | Sí (Modelo y reglas) |
| A08 · Esquemas cerrados y migración de datos | Que datos mal formados no rompan nada | Aviso al cargar |
| A07 · Escritura por comandos | Evita pérdidas al editar | No |
| A13/A14/A15 · Especificaciones LA-TAR, cuestionarios, triangulación | Diseño listo para que lo revise el comité | No (documentos) |
| A05 · CI | Pruebas automáticas en GitHub | No (**ejecutada y en verde en GitHub**, 2026-11-26) |
| A09 · Exportación con hash, completo o mínimo | Minimizar datos al compartir | Sí |
| **Solicitudes entre profesionales** (prototipo local) | Primera pieza de comunicación Farmacia–Infecciosas: pedir, acusar, responder y cerrar | Sí (menú *Solicitudes entre profesionales*) |
| A10 · Modelo de amenazas + 6 fallos de escape corregidos | Seguridad | No |
| A12 · Mapeo FHIR + 4 ejemplos | Base para integrar | No (**validador oficial sin ejecutar**) |

## 3. Qué NO está hecho (importa más que lo hecho)
- **Nada está validado clínicamente.** Las 6 reglas siguen «Pendiente de validación profesional».
- No hay servidor, usuarios, roles, auditoría protegida ni FHIR operativo: es una demo local.
- Las especificaciones LA-TAR / cuestionarios / triangulación **no tienen motor**: son diseño.

## 4. Lo único que solo puedes desbloquear tú (por orden)
1. **Quién decide**: ¿qué órgano actúa como comité de reglas? (D-G01) — sin esto, nada de lo clínico se aprueba.
2. **Qué es el producto**: E1 organizativo / E2 señales de apoyo / E3 seguimiento activo (D-G05; paquete en `INTENDED_PURPOSE_DECISION.md`).
3. **Licencia y titularidad** (D-G09) — desbloquea A11.
4. **Un segundo revisor** del corpus del PDC (D-G11) y **dos clínicos** para LA-TAR.
5. **Centro piloto y sponsor** (D-G03).

Total: 53 decisiones abiertas, todas con responsable y orden en `DECISIONS_REGISTER.md`.

## 5. Siguiente paso propuesto
Parar de construir y **aterrizar**: tú decides los puntos 1–3 (30 minutos) y yo preparo el paquete para el comité. Seguir construyendo sin esas decisiones solo añade código sin aprobar.
