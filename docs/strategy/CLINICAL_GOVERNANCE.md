# CLINICAL_GOVERNANCE — Gobernanza clínica de VIHconectados 2.0

| | |
|---|---|
| Estado | **PROPUESTA PARA REVISIÓN** · 2026-11-25 |
| Naturaleza | Marco organizativo y procedimental. No constituye un sistema de calidad certificado ni crea obligaciones hasta que lo adopte formalmente el centro/proyecto |
| Marcado | `[DATO PENDIENTE]` = decisión o dato que solo pueden aportar el equipo clínico o la institución |

---

## 1. Por qué hace falta (evidencia del repositorio)

| Dato objetivo | Interpretación | Consecuencia |
|---|---|---|
| Umbral 0,9 y ventana 180 días son «demostrativos heredados»; `REGLAS.validacion = "Pendiente de validación profesional"` (`motor.js:5-10`) | Hoy ninguna persona ni órgano «posee» formalmente la decisión clínica sobre las reglas | Sin gobernanza no puede haber validación ni control de cambios |
| La biblioteca CMO es una copia literal con discrepancia de nivel declarada (`datos/biblioteca-vih.json`, `PILOTO.md`) y las anclas del guion no están contrastadas con el PDF | El contenido clínico se muestra con apariencia de autoridad sin revisión | Riesgo de uso clínico indebido |
| El nivel CMO se asigna manualmente sin criterios codificados (`almacen.js:140-141`) | La estratificación no es reproducible ni auditable | Sin criterios aprobados, el modelo CMO no puede evaluarse |
| Las señales no tienen prioridad ni protocolo de respuesta (`CONSULTA_SEGUIMIENTO.md`, `PILOTO.md` punto 8) | La alerta existe, la responsabilidad de actuar no | Riesgo de alertas ignoradas o sobrecarga |
| Autoría, desarrollo y modelo conceptual coinciden en una misma persona (README, `legal.js`: autor del desarrollo y del Hub) | Estructura de «punto único» | Riesgo de sesgo de confirmación y dependencia personal; mitigable con revisión independiente (§3) |

---

## 2. Estructura propuesta

### 2.1 Órganos

| Órgano | Composición mínima | Funciones | Frecuencia |
|---|---|---|---|
| **Comité Clínico de Reglas (CCR)** | Farmacia Hospitalaria, Enfermedades Infecciosas, Enfermería, representante de pacientes, calidad/seguridad del paciente, metodología/estadística | Aprobar, modificar y retirar reglas clínicas, umbrales, cuestionarios y contenidos; revisar rendimiento y discrepancias | Mensual al inicio; trimestral después `[DATO PENDIENTE]` |
| **Responsable clínico del producto** | Un facultativo designado | Decide en urgencias entre CCR; custodia de la finalidad prevista | Continuo `[DATO PENDIENTE: nombre]` |
| **Responsable de seguridad de la información y datos (DPD/CISO)** | Del centro | Aprueba cambios con impacto en privacidad/seguridad; EIPD | Según cambios |
| **Responsable de calidad/riesgos** | Calidad del centro | Mantiene registro de riesgos, incidentes, auditorías | Continuo |
| **Equipo técnico** | Desarrollo y operación | Implementa; **no aprueba** reglas clínicas | — |
| **Revisor independiente de reglas** | Profesional ajeno al equipo de desarrollo | Revisa externa y críticamente cada versión de regla de nivel N1 | Por versión |

### 2.2 Matriz RACI de decisiones clave (propuesta)

R = ejecuta · A = aprueba · C = consulta · I = informa

| Decisión | CCR | Resp. clínico | Técnico | DPD/CISO | Calidad | Paciente (rep.) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Nueva regla o umbral N1 | A | R | C | I | C | C |
| Cambio en cuestionario enviado al paciente | A | R | C | C | C | **C** |
| Activar canal con paciente | A | R | R | **A** | C | C |
| Cambio en esquema de datos | I | I | R | A | C | — |
| Activación de IA generativa (N3) | A | R | C | **A** | C | C |
| Retirada urgente de una regla | I | **A** | R | I | R | — |
| Publicación/difusión de resultados | A | R | C | C | C | C |

---

## 3. Conflictos de interés y independencia

**D.** El repositorio atribuye el desarrollo original al Dr. Ramón Morillo Verdugo, que además es autor del MAPEX-ADHEFAR Hub enlazado y participa en el proyecto MAPEX/SEFH del que procede el modelo CMO (`legal.js`, `recursos.js`).

**I.** Esto no es un problema en sí; es una **configuración que exige salvaguardas** habituales en investigación y calidad: quien diseña y quien valida no deberían ser exclusivamente la misma persona.

**R (propuestas).**
1. Declaración pública de intereses (financiación, titularidad, relaciones con SEFH/industria) en cada versión de reglas y en publicaciones.
2. El revisor independiente (§2.1) firma la revisión de cada regla N1.
3. La validación clínica la dirige y analiza un equipo con independencia funcional respecto del desarrollo.
4. Documentar la titularidad y la licencia (backlog A11) para evitar que la continuidad dependa de una persona.

---

## 4. Ciclo de vida de una regla clínica (N1)

```
Propuesta → Revisión de pares → Validación analítica (corpus dorado) → Validación clínica (según nivel de riesgo)
         → Aprobación CCR → Publicación con versión → Vigilancia (discrepancias/incidentes) → Revisión periódica → Retirada
```

### 4.1 Ficha obligatoria de regla (registro versionado)

| Campo | Contenido |
|---|---|
| `id` y `version` | p. ej. `cobertura_oral` / `1.0.0` |
| Descripción clínica | Qué detecta y por qué importa |
| Fuente / justificación | Referencia o criterio aportado por el CCR; `[REQUIERE REFERENCIA]` si no existe |
| Parámetros | Con unidades y rango admitido |
| Población y exclusiones | Cuándo **no** aplica (p. ej. inyectable, ingreso, estudio clínico) |
| Datos de entrada y calidad mínima | Fuentes y fechas efectivas necesarias |
| Salida y texto al profesional | Debe mostrar numerador/denominador/versión (patrón actual de `alertas`) |
| Riesgos asociados | Falsos positivos/negativos esperables |
| Estado de validación | `no validada` · `validación analítica` · `validación clínica en curso` · `validada para X` |
| Aprobación | Actas del CCR, revisor independiente |
| Fecha de vigencia y de revisión | |

**Estado actual de cada parámetro:**

| Parámetro | Valor en código | Estado | Acción gobernada |
|---|---|---|---|
| Ventana de PDC | 180 días (`motor.js:7`) | No validada; heredada de `preparadorconsulta` | CCR decide valor y justificación `[REQUIERE REFERENCIA]` |
| Umbral PDC | 0,9 (`motor.js:8`) | No validada | Ídem; considerar pautas/regímenes diferenciados |
| Regla `experiencia_referida` | Cualquier barrera/dificultad/efecto distinto de «No explorada/Sin…» (`motor.js:240-256`) | No validada | Revisar sensibilidad y listas |
| Nivel CMO | Asignación manual 1–3 | No es regla | Definir criterios aprobados (no inventar) |
| Biblioteca CMO | Texto literal | Sin revisión clínica | Revisión de contenido y fuente |
| Guion MAPEX | Texto literal SEFH | Sin cotejo con PDF | Cotejo y permisos |
| Reglas LA-TAR | No existen | — | Especificar (A13) |

### 4.2 Control de cambios

| Tipo de cambio | Ejemplo | Requisitos |
|---|---|---|
| **Menor** | Corrección de redacción de un texto que no cambia la decisión | Revisión del responsable clínico + registro |
| **Mayor** | Cambio de umbral, ventana, población o fuente | Reevaluación sobre corpus dorado, aprobación CCR, nota de cambios a usuarios |
| **Crítico** | Nueva regla que prioriza contacto con paciente | Todo lo anterior + revisión del impacto en riesgo y, si procede, nueva evaluación regulatoria |

Las instantáneas e informes ya emitidos **no se recalculan** (principio existente en `informes.js`); toda versión de regla queda ligada a las señales que produjo.

---

## 5. Protocolo de respuesta a señales

**D.** Hoy una señal pasa por estados `pendiente → revisada/justificada/actuacion/cerrada` (`senales.js`) con motivo obligatorio; responsables son funciones (`consulta.js:3`).

**Elementos que deben definirse antes de uso real** (todos `[DATO PENDIENTE]`):

| Elemento | Pregunta que el CCR debe responder |
|---|---|
| Tiempo de primera revisión | ¿En cuántos días hábiles debe revisarse una señal pendiente? ¿Por categoría? |
| Responsable por tipo de señal | ¿Farmacia, Infecciosas o Enfermería? ¿Quién revisa la de inyectables? |
| Escalado | ¿Qué ocurre si no se revisa en plazo? ¿A quién y cómo? |
| Contacto con el paciente | ¿Quién lo realiza, por qué canal, con qué guion? |
| Criterios de cierre | ¿Cuándo se considera resuelta? ¿Quién valida? |
| Fatiga de alertas | Límite de señales activas por profesional; agrupación; fusión de duplicados |
| Discrepancia | Registro obligatorio cuando el profesional no está de acuerdo con la señal |
| Señales de calidad de datos vs. asistenciales | Responsable distinto (ya diferenciadas por `categoria` en `senales.js`) |

---

## 6. Supervisión humana y niveles de autonomía

| Nivel | Descripción | Permitido en… |
|---|---|---|
| **L0** — Solo información | El sistema muestra datos | E0/E1 |
| **L1** — Señal para revisión | El sistema propone señales; el profesional decide si actuar | E2 (objetivo de 2.0) |
| **L2** — Propuesta de contacto | El sistema propone contactar con un paciente; el profesional aprueba cada envío | E3 inicial |
| **L3** — Contacto automatizado con escalado | Contacto automático con plantillas aprobadas; el profesional interviene en señales de escalado | E3 solo tras evidencia y aprobación del CCR |
| **L4** — Decisión autónoma sobre tratamiento | **No permitido** en este proyecto | — |

**Reglas:** todo avance de nivel exige evidencia de seguridad y aprobación del CCR; el profesional siempre puede suspender la automatización.

---

## 7. Gobernanza de IA generativa (nivel N3)

1. **Prohibido** en la ruta de cálculo, priorización, estratificación y envío al paciente sin revisión.
2. Uso permitido (tras decisión del CCR): borradores de texto, resúmenes, transcripción de llamadas, lenguaje claro, siempre etiquetados y con aceptación humana explícita.
3. Datos: ningún dato identificativo hacia APIs externas; preferencia por modelos autoalojados `[DATO PENDIENTE: capacidades]`.
4. Evaluación previa: tasa de errores factuales, sesgos, consistencia; prueba con casos sintéticos y revisión clínica.
5. Registro: prompts y respuestas con retención limitada y acceso restringido.
6. Retirada: criterio de pausa si se detectan errores clínicamente relevantes.

---

## 8. Gobernanza de contenido y derechos

| Contenido | Riesgo | Control |
|---|---|---|
| Biblioteca CMO-VIH (`cmo-vih-app` c963da9) | Discrepancia de nivel; derechos de origen | Revisión clínica; trazabilidad de fuente |
| Guion SEFH MAPEX (cap. 4, pp. 24–34) | Derechos SEFH; anclas sin contrastar | Cotejo con el PDF; permiso de redistribución |
| Escalas/cuestionarios (PAM, SMAQ, etc.) | Licencias | No incluir sin autorización; verificar |
| MAPEX-ADHEFAR Hub | Titularidad compartida/autoría | Atribución; acuerdo |
| Hoja del paciente | Comprensión y accesibilidad | Validación de lectura con pacientes; revisión por CCR |

---

## 9. Calidad de datos como responsabilidad clínica

- **Responsable de datos (data steward)** por centro `[DATO PENDIENTE]`.
- Indicadores de calidad mensuales: dispensaciones fuera de episodio, conflictos sin conciliar, eventos sin procedencia, tiempo de captura.
- Los avisos de calidad no se mezclan con señales asistenciales (diseño ya presente, `senales.js` categorías `aviso/datos/asistencial`).
- Toda corrección retrospectiva queda con actor, motivo y fecha (ya implementado para dispensaciones; extender, F-09).

---

## 10. Incidentes, eventos adversos y criterios de pausa

| Tipo | Ejemplos | Respuesta |
|---|---|---|
| **Incidente clínico relacionado con el software** | Señal omitida; PDC mal calculado; mensaje enviado al paciente equivocado | Notificación inmediata; análisis de causa raíz; revisión de riesgos; decisión del CCR sobre pausa |
| **Incidente de datos** | Acceso no autorizado; exportación indebida | Protocolo de brechas del centro (DPD) |
| **Casi-incidente** | Discrepancia detectada antes de causar daño | Registro y aprendizaje |

**Criterios de pausa del piloto (a definir por el CCR):** `[DATO PENDIENTE]`, p. ej. cualquier incidente clínico grave atribuible, brecha de datos, tasa de discrepancia superior a un umbral aprobado.

---

## 11. Participación del paciente y transparencia

- Representante de pacientes en el CCR para aprobar lenguaje, frecuencia y canal.
- Información clara al paciente sobre qué se mide (disponibilidad de medicación, no vigilancia de conducta), quién lo ve y cómo ejercer derechos (EIPD/consentimiento, véase `REGULATORY_READINESS.md`).
- Atención a la brecha digital y de oportunidad (dimensión *Oportunidad* del CMO): ofrecer alternativas no digitales.
- Sensibilidad especial por estigma asociado al VIH: minimizar mensajes con contenido explícito en canales no seguros.

---

## 12. Métricas de gobernanza

| Métrica | Fuente |
|---|---|
| % de reglas con ficha completa y estado de validación | Registro de reglas |
| % de señales revisadas en plazo | Eventos `gestion_senal` |
| Tasa de discrepancia profesional | Registro de discrepancias |
| Incidentes por 1 000 pacientes-mes | Registro de incidentes |
| Tiempo medio de resolución de calidad de datos | Eventos de corrección |
| Cumplimiento de revisión periódica | Actas CCR |

---

## 13. Decisiones que necesito del usuario

1. ¿Existe ya un órgano (grupo MAPEX/ADHEFAR, comisión del hospital) que pueda ejercer de CCR, o hay que crearlo?
2. ¿Quién ejercerá de revisor independiente?
3. Criterios CMO y rejilla vigente (para codificar o no el nivel).
4. Hospital/centro piloto y su sponsor institucional.
5. Disponibilidad de un representante de pacientes.
