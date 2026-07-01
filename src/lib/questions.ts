import type { Locale } from "@/lib/i18n";
import type { Dimension, Layer } from "@/lib/scoring";
import enQuestions from "@/locales/en/questions.json";
import esQuestions from "@/locales/es/questions.json";
import scoringData from "@/data/questions-scoring.json";

export interface QuestionWithText {
  id: string;
  text: string;
  layer: Layer;
  dimension: Dimension | null;
  topic: string;
  polarity: "normal" | "inverse";
  riskLevel: "Low" | "Medium" | "High";
  quickTaste: boolean;
}

type ScoringEntry = {
  layer: string;
  dimension: string | null;
  topic: string;
  polarity: string;
  riskLevel?: string;
  quickTaste: boolean;
};

const scoringById = scoringData.questions as Record<string, ScoringEntry>;

const textsByLocale: Record<Locale, Record<string, string>> = {
  en: enQuestions.questions,
  es: esQuestions.questions,
};

/**
 * Returns questions for the given locale, joined with scoring metadata by id.
 * Only ids present in BOTH the locale text file and questions-scoring.json are returned.
 * Order follows the locale text file.
 */
export function loadQuestions(locale: Locale): QuestionWithText[] {
  const texts = textsByLocale[locale];
  return Object.entries(texts).flatMap(([id, text]) => {
    const sc = scoringById[id];
    if (!sc) return [];
    return [
      {
        id,
        text,
        layer: sc.layer as Layer,
        dimension: (sc.dimension ?? null) as Dimension | null,
        topic: sc.topic,
        polarity: sc.polarity as "normal" | "inverse",
        riskLevel: (sc.riskLevel ?? "Low") as "Low" | "Medium" | "High",
        quickTaste: sc.quickTaste,
      },
    ];
  });
}

export function loadQuickTasteQuestions(locale: Locale): QuestionWithText[] {
  return loadQuestions(locale)
    .filter((question) => question.quickTaste)
    .sort((a, b) => a.id.localeCompare(b.id));
}
