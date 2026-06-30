import { describe, expect, it } from "vitest";
import enQuestions from "@/locales/en/questions.json";
import esQuestions from "@/locales/es/questions.json";
import scoringData from "@/data/questions-scoring.json";
import { loadQuestions } from "@/lib/questions";
import { computeScore } from "@/lib/scoring";
import type { Answer } from "@/lib/scoring";

const expectedIds = Array.from({ length: 20 }, (_, index) =>
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
  }
>;

const scoring = scoringData.questions as ScoringForTest;

describe("questions data integrity", () => {
  it("es/questions.json, en/questions.json, and questions-scoring.json expose exactly Q001-Q020", () => {
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

  it("Q004 and Q015 are layer safety and have null dimension", () => {
    for (const id of ["Q004", "Q015"]) {
      expect(scoring[id].layer).toBe("safety");
      expect(scoring[id].dimension).toBeNull();
    }
  });

  it("Q015 is safety, Q016/Q017/Q019 are meta, and other Q011-Q020 entries are dimension", () => {
    const expectedLayers: Record<string, string> = {
      Q011: "dimension",
      Q012: "dimension",
      Q013: "dimension",
      Q014: "dimension",
      Q015: "safety",
      Q016: "meta",
      Q017: "meta",
      Q018: "dimension",
      Q019: "meta",
      Q020: "dimension",
    };

    for (const [id, layer] of Object.entries(expectedLayers)) {
      expect(scoring[id].layer).toBe(layer);
    }
  });

  it("Q016 and Q017 are inverse polarity meta questions", () => {
    for (const id of ["Q016", "Q017"]) {
      expect(scoring[id].layer).toBe("meta");
      expect(scoring[id].polarity).toBe("inverse");
      expect(scoring[id].dimension).toBeNull();
    }
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

  it("Q011-Q020 include riskLevel metadata", () => {
    for (const id of expectedIds.slice(10)) {
      expect(["Low", "Medium", "High"]).toContain(scoring[id].riskLevel);
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
  it("returns 20 questions for both locales", () => {
    expect(loadQuestions("en")).toHaveLength(20);
    expect(loadQuestions("es")).toHaveLength(20);
  });

  it("returns the same number of questions for both locales", () => {
    expect(loadQuestions("en").length).toBe(loadQuestions("es").length);
  });

  it("returns one entry per id present in both text and scoring files", () => {
    const result = loadQuestions("es");
    const resultIds = result.map((question) => question.id);
    expect(sortIds(resultIds)).toEqual(expectedIds);
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
    }
  });

  it("Q004 and Q015 from loadQuestions are layer safety", () => {
    for (const id of ["Q004", "Q015"]) {
      const question = loadQuestions("es").find((q) => q.id === id);
      expect(question).toBeDefined();
      expect(question!.layer).toBe("safety");
      expect(question!.dimension).toBeNull();
    }
  });

  it("safety and meta layers do not contribute to the dimension profile", () => {
    const questions = loadQuestions("es");
    const nonProfileQuestionIds = ["Q004", "Q015", "Q016", "Q017", "Q019"];
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
    }
  });
});
