import { describe, expect, it } from "vitest";
import enQuestions from "@/locales/en/questions.json";
import esQuestions from "@/locales/es/questions.json";
import scoringData from "@/data/questions-scoring.json";
import { loadQuestions } from "@/lib/questions";

const esIds = Object.keys(esQuestions.questions);
const enIds = Object.keys(enQuestions.questions);
const scoringIds = Object.keys(scoringData.questions);

describe("questions data integrity", () => {
  it("es/questions.json and en/questions.json have the same ids", () => {
    expect(esIds.sort()).toEqual(enIds.sort());
  });

  it("every id in locale files has a matching entry in questions-scoring.json", () => {
    const missing = esIds.filter((id) => !scoringIds.includes(id));
    expect(missing).toEqual([]);
  });

  it("Q004 is layer safety and has null dimension", () => {
    const scoring = scoringData.questions as Record<
      string,
      { layer: string; dimension: string | null }
    >;
    expect(scoring["Q004"].layer).toBe("safety");
    expect(scoring["Q004"].dimension).toBeNull();
  });

  it("all layer=dimension entries in Q001-Q010 have a non-null dimension", () => {
    const scoring = scoringData.questions as Record<
      string,
      { layer: string; dimension: string | null }
    >;
    const q001to010 = esIds.filter((id) =>
      ["Q001","Q002","Q003","Q004","Q005","Q006","Q007","Q008","Q009","Q010"].includes(id),
    );
    for (const id of q001to010) {
      const sc = scoring[id];
      if (sc.layer === "dimension") {
        expect(sc.dimension, `${id} is layer=dimension but has null dimension`).not.toBeNull();
      }
    }
  });

  it("no question text is empty or missing in either locale", () => {
    for (const [id, text] of Object.entries(esQuestions.questions)) {
      expect(text, `ES text missing for ${id}`).toBeTruthy();
    }
    for (const [id, text] of Object.entries(enQuestions.questions)) {
      expect(text, `EN text missing for ${id}`).toBeTruthy();
    }
  });
});

describe("loadQuestions join function", () => {
  it("returns the same number of questions for both locales", () => {
    expect(loadQuestions("en").length).toBe(loadQuestions("es").length);
  });

  it("returns one entry per id present in both text and scoring files", () => {
    const result = loadQuestions("es");
    const resultIds = result.map((q) => q.id).sort();
    expect(resultIds).toEqual(esIds.sort());
  });

  it("EN and ES results have identical ids and scoring fields", () => {
    const en = loadQuestions("en");
    const es = loadQuestions("es");
    expect(en.map((q) => q.id)).toEqual(es.map((q) => q.id));
    for (let i = 0; i < en.length; i++) {
      expect(en[i].layer).toBe(es[i].layer);
      expect(en[i].dimension).toBe(es[i].dimension);
      expect(en[i].topic).toBe(es[i].topic);
      expect(en[i].polarity).toBe(es[i].polarity);
    }
  });

  it("Q004 from loadQuestions is layer safety", () => {
    const q004 = loadQuestions("es").find((q) => q.id === "Q004");
    expect(q004).toBeDefined();
    expect(q004!.layer).toBe("safety");
    expect(q004!.dimension).toBeNull();
  });

  it("EN text differs from ES text for every question", () => {
    const en = loadQuestions("en");
    const es = loadQuestions("es");
    for (let i = 0; i < en.length; i++) {
      expect(en[i].text).not.toBe(es[i].text);
    }
  });

  it("changing locale does not change scoring fields — rule-1.3 scoring is language-agnostic", () => {
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
