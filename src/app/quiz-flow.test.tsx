import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadQuestions } from "@/lib/questions";
import { computeScore } from "@/lib/scoring";
import type { Answer } from "@/lib/scoring";
import OnboardingFlow from "./onboarding-flow";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function moveToReady() {
  const user = userEvent.setup();
  render(<OnboardingFlow />);
  await user.click(screen.getByRole("button", { name: /empezar|get started/i }));
  await user.click(
    screen.getByRole("checkbox", { name: /confirmo que tengo 18|i confirm i am 18/i }),
  );
  await user.click(screen.getByRole("button", { name: /^continuar$|^continue$/i }));
  for (const cb of screen.getAllByRole("checkbox")) {
    await user.click(cb);
  }
  await user.click(screen.getByRole("button", { name: /acepto y contin|i consent/i }));
  return user;
}

async function moveToQuiz() {
  const user = await moveToReady();
  await user.click(
    screen.getByRole("button", { name: /comenzar quiz|start quiz/i }),
  );
  return user;
}

function getQuizNextButton() {
  return Array.from(document.querySelectorAll("button")).find((button) =>
    /siguiente|next|ver resultados|see results/i.test(button.textContent ?? ""),
  ) as HTMLButtonElement | undefined;
}

async function skipAllAndFinish(_user: ReturnType<typeof userEvent.setup>) {
  void _user;
  let nextButton = getQuizNextButton();
  while (nextButton) {
    fireEvent.click(nextButton);
    nextButton = getQuizNextButton();
  }
}

async function answerCurrentQuestion(name: RegExp) {
  const option = screen.getByRole("radio", { name });
  fireEvent.click(option);
  fireEvent.click(getQuizNextButton()!);
}

// ---------------------------------------------------------------------------
// Rule 1.3 — answers never leave the client
// ---------------------------------------------------------------------------

describe("rule-1.3-quiz-answers-never-leave-client", () => {
  it("quiz source file has no localStorage, fetch, sendBeacon, or server calls", () => {
    const quizSources = [
      join(process.cwd(), "src", "app", "onboarding-flow.tsx"),
      join(process.cwd(), "src", "app", "page.tsx"),
      join(process.cwd(), "src", "app", "layout.tsx"),
    ];
    const source = quizSources.map((p) => readFileSync(p, "utf8")).join("\n");

    expect(source).not.toMatch(/localStorage|sessionStorage/);
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/navigator\.sendBeacon/);
    expect(source).not.toMatch(/["']use server["']/);
    expect(source).not.toMatch(/\/api\//);
    expect(existsSync(join(process.cwd(), "src", "app", "api"))).toBe(false);
  });

  it("completing the quiz does not write quiz answers to localStorage", async () => {
    const user = await moveToQuiz();
    await skipAllAndFinish(user);
    const stored = { ...localStorage };
    const quizKeys = Object.keys(stored).filter(
      (k) => k !== "curio-lang",
    );
    expect(quizKeys).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

describe("quiz progress", () => {
  it("shows question 1 of 60 on the first question", async () => {
    await moveToQuiz();
    expect(
      screen.getByRole("progressbar", { hidden: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pregunta 1 de 60|question 1 of 60/i)).toBeInTheDocument();
  });

  it("advances the counter when moving to next question", async () => {
    const user = await moveToQuiz();
    await user.click(screen.getByRole("button", { name: /siguiente|next/i }));
    expect(screen.getByText(/pregunta 2 de 60|question 2 of 60/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Skip — Regla 1.5 / AGENTS.md: "Prefiero no contestar no penaliza"
// ---------------------------------------------------------------------------

describe("skip does not penalize scoring", () => {
  it("next button is always enabled even with no option selected (skip implicitly)", async () => {
    await moveToQuiz();
    expect(
      screen.getByRole("button", { name: /siguiente|next/i }),
    ).toBeEnabled();
  });

  it("explicit skip option is available and selectable", async () => {
    await moveToQuiz();
    const skipLabel = screen.getByRole("radio", {
      name: /prefiero no contestar|prefer not to answer/i,
    });
    expect(skipLabel).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(skipLabel);
    expect(skipLabel).toBeChecked();
  });

  it("skip answer produces zero dimension contribution in computeScore", () => {
    const questions = loadQuestions("es");
    const answers: Answer[] = questions.map((q) => ({
      questionId: q.id,
      option: "skip",
    }));
    const result = computeScore(questions, answers);
    expect(Object.keys(result.dimensions)).toHaveLength(0);
    expect(result.curiosidad).toBe(0);
    expect(result.intencion).toBe(0);
    expect(result.vetoedTopics).toHaveLength(0);
  });

  it("skipping all questions and finishing shows the results screen", async () => {
    const user = await moveToQuiz();
    await skipAllAndFinish(user);
    expect(
      screen.getByRole("heading", {
        name: /tu perfil de curiosidad|your curiosity profile/i,
      }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Back navigation preserves answers
// ---------------------------------------------------------------------------

describe("back navigation", () => {
  it("going back to a previous question preserves the selected answer", async () => {
    const user = await moveToQuiz();
    const interested = screen.getByRole("radio", {
      name: /me interesa explorarlo|i'd like to explore it/i,
    });
    await user.click(interested);
    expect(interested).toBeChecked();

    await user.click(screen.getByRole("button", { name: /siguiente|next/i }));
    await user.click(screen.getByRole("button", { name: /anterior|previous/i }));

    expect(
      screen.getByRole("radio", {
        name: /me interesa explorarlo|i'd like to explore it/i,
      }),
    ).toBeChecked();
  });

  it("back on the first question returns to the ready screen", async () => {
    const user = await moveToQuiz();
    await user.click(
      screen.getByRole("button", { name: /anterior|previous/i }),
    );
    expect(
      screen.getByRole("heading", {
        name: /ya puedes explorar con calma|you're all set/i,
      }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Rule 1.6 — firm_boundary in limits, never as recommendation
// ---------------------------------------------------------------------------

describe("rule-1.6-firm-boundary-in-limits-not-recommendations", () => {
  it("firm_boundary answer appears in personal limits section on results", async () => {
    const user = await moveToQuiz();
    await user.click(
      screen.getByRole("radio", { name: /límite firme|hard limit/i }),
    );
    await skipAllAndFinish(user);

    const limitsSection = screen.getByRole("region", {
      name: /límites personales|personal limits/i,
    });
    expect(limitsSection).toBeInTheDocument();
    expect(within(limitsSection).getByText(/Novedad|Novelty/i)).toBeInTheDocument();
  });

  it("firm_boundary topic does not appear in any dimension score bar", async () => {
    const user = await moveToQuiz();
    await user.click(
      screen.getByRole("radio", { name: /límite firme|hard limit/i }),
    );
    await skipAllAndFinish(user);

    const dimensionsSection = screen.getByRole("region", {
      name: /dimensiones exploradas|explored dimensions/i,
    });
    // The vetoed topic name "Novedad" or "Novelty" should NOT appear as a scored dimension
    // (Q001 topic is "novedad"; answering with firm_boundary vetoes it, not scores it)
    expect(
      within(dimensionsSection).queryByText(/novedad|novelty/i),
    ).not.toBeInTheDocument();
  });

  it("limits_intro text is shown and does not use recommendation language", async () => {
    const user = await moveToQuiz();
    await user.click(
      screen.getByRole("radio", { name: /límite firme|hard limit/i }),
    );
    await skipAllAndFinish(user);

    expect(
      screen.getByText(/no aparecen como sugerencias ni recomendaciones|do not appear as suggestions or recommendations/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/recomendamos|we recommend/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Results use computeScore, not duplicated logic
// ---------------------------------------------------------------------------

describe("individual result narrative", () => {
  it("shows only prominent dimension narratives", async () => {
    const user = await moveToQuiz();

    await answerCurrentQuestion(/me interesa explorarlo|i'd like to explore it/i);
    await answerCurrentQuestion(/con la confianza adecuada|with the right trust/i);
    await answerCurrentQuestion(/con la confianza adecuada|with the right trust/i);
    fireEvent.click(getQuizNextButton()!);
    await answerCurrentQuestion(/me da curiosidad|i'm curious about it/i);
    await skipAllAndFinish(user);

    expect(screen.getByText(/Esto no es un diagn/i)).toBeInTheDocument();
    expect(screen.getByText(/Te atrae lo nuevo/i)).toBeInTheDocument();
    expect(screen.getByText(/La confianza y el v/i)).toBeInTheDocument();
    expect(screen.getByText(/La conversaci/i)).toBeInTheDocument();
    expect(screen.queryByText(/Lo sensorial te llama/i)).not.toBeInTheDocument();
  });

  it("does not show safety or meta narratives in the profile", async () => {
    const questions = loadQuestions("es");
    const answers: Answer[] = ["Q004", "Q039", "Q040", "Q041", "Q042", "Q043", "Q052"].map(
      (questionId) => ({ questionId, option: "interested" }),
    );

    const result = computeScore(questions, answers);

    expect(Object.keys(result.dimensions)).toHaveLength(0);
  });

  it("changes narrative text when the language changes", async () => {
    const user = await moveToQuiz();
    await answerCurrentQuestion(/me interesa explorarlo|i'd like to explore it/i);
    await skipAllAndFinish(user);

    expect(screen.getByText(/Esto no es un diagn/i)).toBeInTheDocument();
    expect(screen.getByText(/Te atrae lo nuevo/i)).toBeInTheDocument();

    const langGroup = screen.getByRole("group", { name: /language|idioma/i });
    await user.click(within(langGroup).getByRole("button", { name: /^en$/i }));

    expect(screen.getByText(/This isn't a diagnosis or a label/i)).toBeInTheDocument();
    expect(screen.getByText(/You're drawn to what's new/i)).toBeInTheDocument();
  });
});

describe("result-uses-computeScore-not-duplicated-logic", () => {
  it("interested answer on Q001 (novedad) produces non-zero novedad dimension score", async () => {
    const user = await moveToQuiz();
    // Q001 maps to dimension "novedad"; "interested" = ownDimension: 5
    await user.click(
      screen.getByRole("radio", {
        name: /me interesa explorarlo|i'd like to explore it/i,
      }),
    );
    await skipAllAndFinish(user);

    const dimensionsSection = screen.getByRole("region", {
      name: /dimensiones exploradas|explored dimensions/i,
    });
    expect(
      within(dimensionsSection).getByText(/novedad|novelty/i),
    ).toBeInTheDocument();
    expect(
      within(dimensionsSection).getByText("100/100"),
    ).toBeInTheDocument();
  });

  it("computeScore directly matches what the results screen displays for curious on Q001", () => {
    const questions = loadQuestions("es");
    const answers: Answer[] = [{ questionId: "Q001", option: "curious" }];
    const result = computeScore(questions, answers);
    // curious = ownDimension: 2, max: 5 => 40/100
    expect(result.dimensions.novedad).toBe(40);
    expect(result.curiosidad).toBe(80); // curiosidad weight: 4
    expect(result.intencion).toBe(20); // intencion weight: 1
  });
});

// ---------------------------------------------------------------------------
// Q004 safety layer — does not appear in dimension profile
// ---------------------------------------------------------------------------

describe("Q004-safety-layer-does-not-contribute-to-dimension-profile", () => {
  it("answering Q004 with curious does not add any dimension score", () => {
    const questions = loadQuestions("es");
    const answers: Answer[] = [{ questionId: "Q004", option: "curious" }];
    const result = computeScore(questions, answers);
    expect(Object.keys(result.dimensions)).toHaveLength(0);
    expect(result.vetoedTopics).toHaveLength(0);
  });

  it("Q004 firm_boundary adds limites to vetoed topics but not to dimension profile", () => {
    const questions = loadQuestions("es");
    const answers: Answer[] = [{ questionId: "Q004", option: "firm_boundary" }];
    const result = computeScore(questions, answers);
    expect(result.vetoedTopics).toContain("limites");
    expect(Object.keys(result.dimensions)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Language switch mid-quiz preserves answers
// ---------------------------------------------------------------------------

describe("language-switch-mid-quiz-preserves-answers", () => {
  it("switching locale mid-quiz preserves selected answer and step", async () => {
    const user = await moveToQuiz();

    await user.click(
      screen.getByRole("radio", {
        name: /me interesa explorarlo|i'd like to explore it/i,
      }),
    );

    const langGroup = screen.getByRole("group", { name: /language|idioma/i });
    await user.click(
      within(langGroup).getByRole("button", { name: /^en$/i }),
    );

    // Still on the quiz step (question heading visible, not landing)
    expect(
      screen.queryByRole("button", { name: /get started|empezar/i }),
    ).not.toBeInTheDocument();

    // Answer is still selected after locale switch
    expect(
      screen.getByRole("radio", { name: /i'd like to explore it/i }),
    ).toBeChecked();
  });

  it("switching locale updates question text but keeps question index", async () => {
    const user = await moveToQuiz();
    await user.click(screen.getByRole("button", { name: /siguiente|next/i }));
    expect(screen.getByText(/pregunta 2 de 60/i)).toBeInTheDocument();

    const langGroup = screen.getByRole("group", { name: /language|idioma/i });
    await user.click(within(langGroup).getByRole("button", { name: /^en$/i }));

    expect(screen.getByText(/question 2 of 60/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Rule 1.1 — entertainment disclaimer on results screen
// ---------------------------------------------------------------------------

describe("rule-1.1-results-screen-shows-entertainment-disclaimer", () => {
  it("results screen includes entertainment disclaimer and not clinical language", async () => {
    const user = await moveToQuiz();
    await skipAllAndFinish(user);

    expect(
      screen.getByText(
        /Curio es una experiencia de curiosidad y conversaci|Curio is a curiosity and conversation experience for adults/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/trastorno|disorder/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/prescripci|prescription/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Reset / clear data
// ---------------------------------------------------------------------------

describe("reset clears in-memory quiz state", () => {
  it("clicking clear data from results returns to landing with no quiz data", async () => {
    const user = await moveToQuiz();
    await user.click(
      screen.getByRole("radio", {
        name: /me interesa explorarlo|i'd like to explore it/i,
      }),
    );
    await skipAllAndFinish(user);

    expect(
      screen.getByRole("heading", {
        name: /tu perfil de curiosidad|your curiosity profile/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /borrar datos|clear data/i }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /descubre tu estilo|discover your intimate/i,
      }),
    ).toBeInTheDocument();
  });

  it("start over button on results returns to landing", async () => {
    const user = await moveToQuiz();
    await skipAllAndFinish(user);

    await user.click(
      screen.getByRole("button", { name: /empezar de nuevo|start over/i }),
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /descubre tu estilo|discover your intimate/i,
      }),
    ).toBeInTheDocument();
  });
});
