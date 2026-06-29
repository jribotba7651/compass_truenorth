/**
 * scoring.ts — Motor de scoring de Curio.
 *
 * Fuente de verdad: Plan de Desarrollo, secciones 4.5–4.7, y AGENTS.md (reglas 1.5, 1.6).
 * El scoring vive separado del texto de las preguntas: cambiar de idioma nunca
 * cambia el resultado. Este modulo no importa ningun texto de pregunta.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Las 8 opciones de respuesta. IDs estables, nunca cambian por idioma. */
export type AnswerOption =
  | "firm_boundary"
  | "not_now"
  | "fantasy_only"
  | "curious"
  | "talk_first"
  | "with_trust"
  | "interested"
  | "skip";

/** Dimensiones del modelo (seccion 4.1) mas los dos ejes globales. */
export type Dimension =
  | "visual"
  | "sensorial"
  | "emocional"
  | "fantasia_narrativa"
  | "novedad"
  | "validacion"
  | "poder_consensuado"
  | "privacidad"
  | "comunicacion";

export type GlobalAxis = "curiosidad" | "intencion";

/** Capa de la pregunta (seccion 4.8). Solo "dimension" alimenta el perfil. */
export type Layer = "dimension" | "safety" | "meta";

export interface Question {
  id: string;                 // p.ej. "Q014", estable
  layer: Layer;               // dimension | safety | meta
  dimension: Dimension | null;// solo para layer "dimension"; null en safety/meta
  topic: string;              // tema, usado para el veto por tema
  polarity: "normal" | "inverse"; // inverse = mas acuerdo significa menos apertura
  riskLevel: "Low" | "Medium" | "High";
}

export interface Answer {
  questionId: string;
  option: AnswerOption;
}

/** Pesos crudos por opcion: dimension propia, curiosidad, intencion. */
interface Weight {
  ownDimension: number;
  curiosidad: number;
  intencion: number;
  veto?: boolean; // firm_boundary marca el tema como no-explorable
}

// ---------------------------------------------------------------------------
// Matriz de scoring (seccion 4.6). Escala 0 a 5. Polaridad normal.
// ---------------------------------------------------------------------------

export const SCORING_MATRIX: Record<AnswerOption, Weight> = {
  firm_boundary: { ownDimension: 0, curiosidad: 0, intencion: 0, veto: true },
  not_now:       { ownDimension: 0, curiosidad: 1, intencion: 0 },
  fantasy_only:  { ownDimension: 1, curiosidad: 4, intencion: 0 }, // nunca intencion
  curious:       { ownDimension: 2, curiosidad: 4, intencion: 1 },
  talk_first:    { ownDimension: 3, curiosidad: 3, intencion: 2 }, // senala comunicacion
  with_trust:    { ownDimension: 4, curiosidad: 3, intencion: 3 },
  interested:    { ownDimension: 5, curiosidad: 3, intencion: 5 },
  skip:          { ownDimension: 0, curiosidad: 0, intencion: 0 }, // fuera del denominador
};

/** Opciones de la escala ordenadas de cerrado a abierto, para invertir polaridad. */
const OPENNESS_ORDER: AnswerOption[] = [
  "firm_boundary",
  "not_now",
  "fantasy_only",
  "curious",
  "talk_first",
  "with_trust",
  "interested",
];

/**
 * Para una pregunta de polaridad inversa, mapea la opcion elegida a su espejo
 * en la escala de apertura. firm_boundary y skip nunca se invierten:
 * un veto es un veto, y un skip es ausencia de dato, en cualquier polaridad.
 */
function applyPolarity(option: AnswerOption, polarity: Question["polarity"]): AnswerOption {
  if (polarity === "normal") return option;
  if (option === "skip" || option === "firm_boundary") return option;
  const i = OPENNESS_ORDER.indexOf(option);
  if (i < 0) return option;
  // Espejo dentro de la escala, excluyendo firm_boundary (indice 0) del volteo
  // para no convertir una apertura alta en un veto.
  const scale = OPENNESS_ORDER.slice(1); // not_now..interested
  const j = scale.indexOf(option);
  if (j < 0) return option;
  return scale[scale.length - 1 - j];
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

export interface ScoreResult {
  /** Score 0 a 100 por dimension. Solo dimensiones con al menos una respuesta valida. */
  dimensions: Partial<Record<Dimension, number>>;
  /** Ejes globales 0 a 100. */
  curiosidad: number;
  intencion: number;
  /** Temas vetados por firm_boundary. Nunca se recomiendan (regla 1.6). */
  vetoedTopics: string[];
}

const MAX_WEIGHT = 5; // tope de la escala, para normalizar a 0..100

/**
 * Calcula el resultado. Reglas aplicadas:
 *  - skip no entra en el denominador (regla 4.7).
 *  - fantasy_only nunca suma intencion (regla 1.5).
 *  - firm_boundary veta el tema, no la dimension (regla 1.6).
 *  - polaridad inversa voltea el mapeo sin cambiar pesos.
 */
export function computeScore(questions: Question[], answers: Answer[]): ScoreResult {
  const qById = new Map(questions.map((q) => [q.id, q]));

  const dimSum: Partial<Record<Dimension, number>> = {};
  const dimCount: Partial<Record<Dimension, number>> = {};
  let curSum = 0;
  let curCount = 0;
  let intSum = 0;
  let intCount = 0;
  const vetoed = new Set<string>();

  for (const ans of answers) {
    const q = qById.get(ans.questionId);
    if (!q) continue;

    const option = applyPolarity(ans.option, q.polarity);
    const w = SCORING_MATRIX[option];

    // El veto aplica en CUALQUIER capa: un limite firme es un limite firme
    // aunque la pregunta sea de seguridad o meta (regla 1.5 / 1.6).
    if (w.veto) {
      vetoed.add(q.topic);
      continue;
    }
    if (option === "skip") {
      // No cuenta en ningun denominador.
      continue;
    }

    // Solo las preguntas de capa "dimension" alimentan el perfil de 8 dimensiones.
    // safety y meta se procesan en otras capas (tono, defaults), no aqui (seccion 4.8).
    if (q.layer !== "dimension" || q.dimension === null) {
      continue;
    }

    dimSum[q.dimension] = (dimSum[q.dimension] ?? 0) + w.ownDimension;
    dimCount[q.dimension] = (dimCount[q.dimension] ?? 0) + 1;

    curSum += w.curiosidad;
    curCount += 1;
    intSum += w.intencion;
    intCount += 1;
  }

  const dimensions: Partial<Record<Dimension, number>> = {};
  for (const dim of Object.keys(dimSum) as Dimension[]) {
    const count = dimCount[dim] ?? 0;
    if (count > 0) {
      dimensions[dim] = Math.round(((dimSum[dim] ?? 0) / (count * MAX_WEIGHT)) * 100);
    }
  }

  return {
    dimensions,
    curiosidad: curCount > 0 ? Math.round((curSum / (curCount * MAX_WEIGHT)) * 100) : 0,
    intencion: intCount > 0 ? Math.round((intSum / (intCount * MAX_WEIGHT)) * 100) : 0,
    vetoedTopics: [...vetoed],
  };
}

/**
 * Guardia para el generador de recomendaciones (regla 1.6).
 * Un tema vetado nunca puede aparecer como sugerencia de exploracion.
 */
export function isTopicAllowed(topic: string, result: ScoreResult): boolean {
  return !result.vetoedTopics.includes(topic);
}
