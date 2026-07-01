import { describe, expect, it } from "vitest";
import enQuestions from "@/locales/en/questions.json";
import esQuestions from "@/locales/es/questions.json";
import scoringData from "@/data/questions-scoring.json";
import { loadQuestions, loadQuickTasteQuestions } from "@/lib/questions";
import { computeScore } from "@/lib/scoring";
import type { Answer } from "@/lib/scoring";

const expectedIds = Array.from({ length: 60 }, (_, index) =>
  "Q" + String(index + 1).padStart(3, "0"),
);
const esIds = Object.keys(esQuestions.questions);
const enIds = Object.keys(enQuestions.questions);
const scoringIds = Object.keys(scoringData.questions);
const sortIds = (ids: string[]) => [...ids].sort();

type ScoringForTest = Record<
  string,
  {
    layer: string;
    dimension: string | null;
    topic: string;
    polarity: string;
    riskLevel?: string;
    quickTaste: boolean;
  }
>;

const scoring = scoringData.questions as ScoringForTest;
const safetyIds = [
  "Q004",
  "Q015",
  "Q021",
  "Q025",
  "Q028",
  "Q037",
  "Q052",
  "Q057",
  "Q059",
];
const orientationIds = ["Q039", "Q040", "Q041", "Q042", "Q043"];
const quickTasteIds = [
  "Q001",
  "Q002",
  "Q003",
  "Q005",
  "Q006",
  "Q009",
  "Q010",
  "Q011",
  "Q014",
  "Q026",
];
const expectedQuickTasteDimensions = [
  "comunicacion",
  "emocional",
  "fantasia_narrativa",
  "novedad",
  "poder_consensuado",
  "sensorial",
  "validacion",
  "visual",
];

describe("questions data integrity", () => {
  it("es/questions.json, en/questions.json, and questions-scoring.json expose exactly Q001-Q060", () => {
    expect(sortIds(esIds)).toEqual(expectedIds);
    expect(sortIds(enIds)).toEqual(expectedIds);
    expect(sortIds(scoringIds)).toEqual(expectedIds);
  });

  it("es/questions.json and en/questions.json have the same ids", () => {
    expect(sortIds(esIds)).toEqual(sortIds(enIds));
  });

  it("every id in locale files has a matching entry in questions-scoring.json", () => {
    const missing = esIds.filter((id) => !scoringIds.includes(id));
    expect(missing).toEqual([]);
  });

  it("all safety questions are layer safety and have null dimension", () => {
    for (const id of safetyIds) {
      expect(scoring[id].layer).toBe("safety");
      expect(scoring[id].dimension).toBeNull();
    }
  });

  it("Q021/Q025/Q028 are safety, Q024/Q027 are meta, and other Q021-Q030 entries are dimension", () => {
    const expectedLayers: Record<string, string> = {
      Q021: "safety",
      Q022: "dimension",
      Q023: "dimension",
      Q024: "meta",
      Q025: "safety",
      Q026: "dimension",
      Q027: "meta",
      Q028: "safety",
      Q029: "dimension",
      Q030: "dimension",
    };

    for (const [id, layer] of Object.entries(expectedLayers)) {
      expect(scoring[id].layer).toBe(layer);
    }
  });

  it("Q016, Q017, and Q044 are inverse polarity meta questions", () => {
    for (const id of ["Q016", "Q017", "Q044"]) {
      expect(scoring[id].layer).toBe("meta");
      expect(scoring[id].polarity).toBe("inverse");
      expect(scoring[id].dimension).toBeNull();
    }
  });

  it("Q021-Q030 are all normal polarity", () => {
    for (const id of expectedIds.slice(20, 30)) {
      expect(scoring[id].polarity).toBe("normal");
    }
  });

  it("rule-1.4-orientacion-topic-is-meta-only-and-not-profile-dimension", () => {
    const ids = expectedIds.filter((id) => scoring[id].topic === "orientacion");
    expect(ids).toEqual(orientationIds);
    for (const id of ids) {
      expect(scoring[id].layer).toBe("meta");
      expect(scoring[id].dimension).toBeNull();
    }
  });

  it("no question with topic orientacion feeds a dimension", () => {
    const invalid = expectedIds.filter(
      (id) => scoring[id].topic === "orientacion" && scoring[id].layer === "dimension",
    );
    expect(invalid).toEqual([]);
  });

  it("layer=dimension entries have dimensions and safety/meta entries do not", () => {
    for (const id of expectedIds) {
      const sc = scoring[id];
      if (sc.layer === "dimension") {
        expect(sc.dimension, id + " is layer=dimension but has null dimension").not.toBeNull();
      } else {
        expect(sc.dimension, id + " is " + sc.layer + " but has a dimension").toBeNull();
      }
    }
  });

  it("Q011-Q060 include riskLevel metadata", () => {
    for (const id of expectedIds.slice(10)) {
      expect(["Low", "Medium", "High"]).toContain(scoring[id].riskLevel);
    }
  });

  it("marks exactly 10 questions as Quick Taste and all others false", () => {
    const marked = expectedIds.filter((id) => scoring[id].quickTaste);
    expect(marked).toEqual(quickTasteIds);

    for (const id of expectedIds) {
      expect(scoring[id].quickTaste).toBe(quickTasteIds.includes(id));
    }
  });

  it("Quick Taste questions cover the expected profile dimensions", () => {
    const dimensions = [...new Set(quickTasteIds.map((id) => scoring[id].dimension))].sort();
    expect(dimensions).toEqual(expectedQuickTasteDimensions);

    for (const id of quickTasteIds) {
      expect(scoring[id].layer).toBe("dimension");
    }
  });

  it("no question text is empty or missing in either locale", () => {
    for (const [id, text] of Object.entries(esQuestions.questions)) {
      expect(text, "ES text missing for " + id).toBeTruthy();
    }
    for (const [id, text] of Object.entries(enQuestions.questions)) {
      expect(text, "EN text missing for " + id).toBeTruthy();
    }
  });
});

describe("loadQuestions join function", () => {
  it("returns 60 questions for both locales", () => {
    expect(loadQuestions("en")).toHaveLength(60);
    expect(loadQuestions("es")).toHaveLength(60);
  });

  it("returns the same number of questions for both locales", () => {
    expect(loadQuestions("en").length).toBe(loadQuestions("es").length);
  });

  it("returns one entry per id present in both text and scoring files", () => {
    const result = loadQuestions("es");
    const resultIds = result.map((question) => question.id);
    expect(sortIds(resultIds)).toEqual(expectedIds);
  });

  it("loadQuickTasteQuestions returns the 10 marked questions in id order", () => {
    const en = loadQuickTasteQuestions("en");
    const es = loadQuickTasteQuestions("es");

    expect(en).toHaveLength(10);
    expect(es).toHaveLength(10);
    expect(en.map((question) => question.id)).toEqual(quickTasteIds);
    expect(es.map((question) => question.id)).toEqual(quickTasteIds);
    expect(en.every((question) => question.quickTaste)).toBe(true);
    expect(es.every((question) => question.quickTaste)).toBe(true);
  });

  it("EN and ES results have identical ids and scoring fields", () => {
    const en = loadQuestions("en");
    const es = loadQuestions("es");
    expect(en.map((question) => question.id)).toEqual(es.map((question) => question.id));
    for (let i = 0; i < en.length; i++) {
      expect(en[i].layer).toBe(es[i].layer);
      expect(en[i].dimension).toBe(es[i].dimension);
      expect(en[i].topic).toBe(es[i].topic);
      expect(en[i].polarity).toBe(es[i].polarity);
      expect(en[i].quickTaste).toBe(es[i].quickTaste);
    }
  });

  it("all safety questions from loadQuestions are layer safety", () => {
    for (const id of safetyIds) {
      const question = loadQuestions("es").find((q) => q.id === id);
      expect(question).toBeDefined();
      expect(question!.layer).toBe("safety");
      expect(question!.dimension).toBeNull();
    }
  });

  it("safety and meta layers do not contribute to the dimension profile", () => {
    const questions = loadQuestions("es");
    const nonProfileQuestionIds = expectedIds.filter((id) => scoring[id].layer !== "dimension");
    const answers: Answer[] = nonProfileQuestionIds.map((questionId) => ({
      questionId,
      option: "interested",
    }));

    const result = computeScore(questions, answers);

    expect(Object.keys(result.dimensions)).toHaveLength(0);
    expect(result.curiosidad).toBe(0);
    expect(result.intencion).toBe(0);
    expect(result.vetoedTopics).toHaveLength(0);
  });

  it("rule-1.4-orientacion-answers-do-not-contribute-to-the-dimension-profile", () => {
    const questions = loadQuestions("es");
    const answers: Answer[] = orientationIds.map((questionId) => ({
      questionId,
      option: "interested",
    }));

    const result = computeScore(questions, answers);

    expect(Object.keys(result.dimensions)).toHaveLength(0);
    expect(result.curiosidad).toBe(0);
    expect(result.intencion).toBe(0);
  });

  it("EN text differs from ES text for every question", () => {
    const en = loadQuestions("en");
    const es = loadQuestions("es");
    for (let i = 0; i < en.length; i++) {
      expect(en[i].text).not.toBe(es[i].text);
    }
  });

  it("changing locale does not change scoring fields - rule-1.3 scoring is language-agnostic", () => {
    const en = loadQuestions("en");
    const es = loadQuestions("es");
    for (const q of en) {
      const match = es.find((e) => e.id === q.id)!;
      expect(q.layer).toBe(match.layer);
      expect(q.dimension).toBe(match.dimension);
      expect(q.polarity).toBe(match.polarity);
      expect(q.topic).toBe(match.topic);
      expect(q.quickTaste).toBe(match.quickTaste);
    }
  });
});
