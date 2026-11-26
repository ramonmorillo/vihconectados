import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * A12 · Comprobación ESTRUCTURAL LOCAL de los ejemplos FHIR sintéticos. NO es la validación oficial de HL7:
 * no comprueba perfiles, terminologías ni invariantes. Solo evita que los ejemplos se deterioren (cardinalidad mínima
 * de R4, conjuntos de valores de `status`, fechas, referencias internas y ausencia de datos identificativos).
 * La validación con el validador oficial sigue PENDIENTE (docs/strategy/FHIR_MAPPING.md §6).
 */
const DIR = new URL('./fhir/', import.meta.url);
const ejemplos = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(new URL(f, DIR), 'utf8'))]));
const FECHA = /^\d{4}-\d{2}-\d{2}$/, INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const REQ = {
  Patient: [],
  MedicationDispense: ['status'],
  MedicationRequest: ['status', 'intent', 'subject'],
  Observation: ['status', 'code'],
};
const ESTADOS = {
  MedicationDispense: ['preparation', 'in-progress', 'cancelled', 'on-hold', 'completed', 'entered-in-error', 'stopped', 'declined', 'unknown'],
  MedicationRequest: ['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown'],
  Observation: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'],
};

test('Los ejemplos son los previstos y cada uno declara un recurso con id', () => {
  assert.deepEqual(Object.keys(ejemplos).sort(), ['MedicationDispense-ejemplo.json', 'MedicationRequest-ejemplo.json', 'Observation-ejemplo.json', 'Patient-ejemplo.json']);
  for (const [f, r] of Object.entries(ejemplos)) {
    assert.ok(f.startsWith(r.resourceType + '-'), f);
    assert.ok(typeof r.id === 'string' && r.id.length > 0, f);
  }
});

test('Cada recurso cumple la cardinalidad mínima de R4 y usa un estado del conjunto de valores', () => {
  for (const [f, r] of Object.entries(ejemplos)) {
    for (const campo of REQ[r.resourceType]) assert.ok(r[campo] !== undefined, `${f}: falta ${campo}`);
    if (r.resourceType === 'MedicationDispense' || r.resourceType === 'MedicationRequest')
      assert.ok(r.medicationCodeableConcept || r.medicationReference, `${f}: falta medication[x]`);
    if (ESTADOS[r.resourceType]) assert.ok(ESTADOS[r.resourceType].includes(r.status), `${f}: estado ${r.status}`);
  }
});

test('Las fechas tienen formato FHIR y las referencias internas apuntan a un recurso existente', () => {
  const ids = new Set(Object.values(ejemplos).map((r) => `${r.resourceType}/${r.id}`));
  const d = ejemplos['MedicationDispense-ejemplo.json'];
  assert.match(d.whenHandedOver, FECHA);
  assert.deepEqual([d.daysSupply.system, d.daysSupply.code], ['http://unitsofmeasure.org', 'd']);
  assert.match(ejemplos['MedicationRequest-ejemplo.json'].authoredOn, FECHA);
  const o = ejemplos['Observation-ejemplo.json'];
  assert.match(o.effectivePeriod.start, FECHA); assert.match(o.effectivePeriod.end, FECHA); assert.match(o.issued, INSTANTE);
  for (const r of Object.values(ejemplos)) if (r.subject) assert.ok(ids.has(r.subject.reference), `referencia ${r.subject.reference}`);
});

test('Ningún ejemplo contiene datos identificativos y todos se declaran sintéticos', () => {
  const p = ejemplos['Patient-ejemplo.json'];
  for (const k of ['name', 'birthDate', 'telecom', 'address', 'gender']) assert.equal(p[k], undefined, `Patient.${k}`);
  assert.match(p.identifier[0].value, /^SINTETICO-/);
  for (const [f, r] of Object.entries(ejemplos)) assert.match(JSON.stringify(r), /SINT[ÉE]TIC/i, `${f} no se declara sintético`);
});

test('No se inventan terminologías: los códigos usan solo sistemas locales urn:vihconectados o UCUM', () => {
  for (const [f, r] of Object.entries(ejemplos)) {
    const sistemas = [...JSON.stringify(r).matchAll(/"system":\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const s of sistemas) assert.ok(s.startsWith('urn:vihconectados:') || s === 'http://unitsofmeasure.org', `${f}: sistema ${s}`);
  }
});
