"use client";

import { useMemo, useState } from "react";
import { LangProvider, LanguageSelector, useI18n } from "@/lib/i18n";
import { loadQuestions } from "@/lib/questions";
import type { QuestionWithText } from "@/lib/questions";
import {
  computeScore,
  type Answer,
  type AnswerOption,
  type Dimension,
  type ScoreResult,
} from "@/lib/scoring";

export type OnboardingStep =
  | "landing"
  | "age"
  | "consent"
  | "ready"
  | "quiz"
  | "results";

type ConsentKey =
  | "adultEntertainment"
  | "voluntaryAnswers"
  | "localOnly"
  | "separateSharing";

export type ConsentState = Record<ConsentKey, boolean>;

export const initialConsentState: ConsentState = {
  adultEntertainment: false,
  voluntaryAnswers: false,
  localOnly: false,
  separateSharing: false,
};

const consentKeys: ConsentKey[] = [
  "adultEntertainment",
  "voluntaryAnswers",
  "localOnly",
  "separateSharing",
];

// Ordered from most-closed to most-open, skip at the end (scale clarity, no nudge)
const QUIZ_ANSWER_OPTIONS: AnswerOption[] = [
  "firm_boundary",
  "not_now",
  "fantasy_only",
  "curious",
  "talk_first",
  "with_trust",
  "interested",
  "skip",
];

const PROFILE_NARRATIVE_DIMENSIONS: Dimension[] = [
  "visual",
  "sensorial",
  "emocional",
  "fantasia_narrativa",
  "novedad",
  "validacion",
  "poder_consensuado",
  "comunicacion",
];
const PROMINENT_DIMENSION_THRESHOLD = 60;
const MAX_PROMINENT_DIMENSIONS = 3;

function getProminentDimensions(
  dimensions: ScoreResult["dimensions"],
): [Dimension, number][] {
  const order = new Map(
    PROFILE_NARRATIVE_DIMENSIONS.map((dimension, index) => [dimension, index]),
  );

  return (Object.entries(dimensions) as [Dimension, number][])
    .filter(
      ([dimension, score]) =>
        PROFILE_NARRATIVE_DIMENSIONS.includes(dimension) &&
        score >= PROMINENT_DIMENSION_THRESHOLD,
    )
    .sort((a, b) => b[1] - a[1] || (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
    .slice(0, MAX_PROMINENT_DIMENSIONS);
}

export function canAdvanceFromAge(isAdult: boolean) {
  return isAdult;
}

export function canAdvanceFromConsent(consent: ConsentState) {
  return Object.values(consent).every(Boolean);
}

function freshConsentState(): ConsentState {
  return { ...initialConsentState };
}

export default function OnboardingFlow() {
  return (
    <LangProvider>
      <OnboardingFlowInner />
    </LangProvider>
  );
}

function OnboardingFlowInner() {
  const { locale } = useI18n();

  const [step, setStep] = useState<OnboardingStep>("landing");
  const [isAdult, setIsAdult] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(freshConsentState);

  // Quiz state — lives only in React memory, never touches server or storage (Rule 1.3)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, AnswerOption>>(
    {},
  );
  const [quizIdx, setQuizIdx] = useState(0);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  const questions = useMemo(() => loadQuestions(locale), [locale]);

  function resetFlow() {
    setStep("landing");
    setIsAdult(false);
    setConsent(freshConsentState());
    setQuizAnswers({});
    setQuizIdx(0);
    setScoreResult(null);
  }

  function handleQuizAnswer(questionId: string, option: AnswerOption) {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  function handleQuizPrevious() {
    if (quizIdx === 0) {
      setStep("ready");
    } else {
      setQuizIdx((i) => i - 1);
    }
  }

  function handleQuizNext() {
    if (quizIdx < questions.length - 1) {
      setQuizIdx((i) => i + 1);
    } else {
      const answerList: Answer[] = Object.entries(quizAnswers).map(
        ([questionId, option]) => ({ questionId, option }),
      );
      setScoreResult(computeScore(questions, answerList));
      setStep("results");
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f7f2] text-[#181610]">
      {step === "landing" && <LandingScreen onStart={() => setStep("age")} />}
      {step === "age" && (
        <AgeGateScreen
          isAdult={isAdult}
          onAdultChange={setIsAdult}
          onBack={() => setStep("landing")}
          onContinue={() => {
            if (canAdvanceFromAge(isAdult)) setStep("consent");
          }}
        />
      )}
      {step === "consent" && (
        <ConsentScreen
          consent={consent}
          onConsentChange={(key, value) =>
            setConsent((current) => ({ ...current, [key]: value }))
          }
          onBack={() => setStep("age")}
          onContinue={() => {
            if (canAdvanceFromConsent(consent)) setStep("ready");
          }}
        />
      )}
      {step === "ready" && (
        <ReadyScreen
          onStartQuiz={() => {
            setQuizIdx(0);
            setStep("quiz");
          }}
          onRestart={resetFlow}
        />
      )}
      {step === "quiz" && (
        <QuizScreen
          questions={questions}
          currentIdx={quizIdx}
          answers={quizAnswers}
          onAnswer={handleQuizAnswer}
          onPrevious={handleQuizPrevious}
          onNext={handleQuizNext}
        />
      )}
      {step === "results" && scoreResult && (
        <ResultsScreen result={scoreResult} onRestart={resetFlow} />
      )}
      <SiteFooter onReset={resetFlow} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

function LandingScreen({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <main>
      <section
        className="relative flex min-h-[86dvh] items-center overflow-hidden bg-[#101615] bg-cover bg-center px-5 py-14 text-white sm:px-8 lg:px-14"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(16,22,21,0.94) 0%, rgba(16,22,21,0.76) 46%, rgba(16,22,21,0.28) 100%), url('/curio-conversation-hero.png')",
        }}
      >
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8ecdc2]">
            {t("landing.eyebrow")}
          </p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#eef7f4] sm:text-xl">
            {t("landing.subhead")}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#8ecdc2] px-6 text-base font-semibold text-[#101615] transition hover:bg-[#a8e2d8] focus:outline-none focus:ring-2 focus:ring-[#8ecdc2] focus:ring-offset-2 focus:ring-offset-[#101615]"
            >
              {t("landing.cta_start")}
            </button>
            <a
              href="#principios"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 px-6 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#101615]"
            >
              {t("landing.cta_principles")}
            </a>
          </div>
        </div>
      </section>

      <section
        id="principios"
        className="grid gap-5 px-5 py-8 sm:px-8 md:grid-cols-3 lg:px-14"
        aria-label={t("landing.principles_aria")}
      >
        <Principle
          title={t("landing.principle_1_title")}
          body={t("landing.principle_1_body")}
        />
        <Principle
          title={t("landing.principle_2_title")}
          body={t("landing.principle_2_body")}
        />
        <Principle
          title={t("landing.principle_3_title")}
          body={t("landing.principle_3_body")}
        />
      </section>
    </main>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-[#d2ddd8] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#181610]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#46534e]">{body}</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Age gate
// ---------------------------------------------------------------------------

function AgeGateScreen({
  isAdult,
  onAdultChange,
  onBack,
  onContinue,
}: {
  isAdult: boolean;
  onAdultChange: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#e8f3ef] px-5 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-[#bdd5ce] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
          {t("age.step")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#181610] sm:text-4xl">
          {t("age.heading")}
        </h1>
        <p className="mt-4 text-base leading-7 text-[#46534e]">
          {t("age.description")}
        </p>

        <label className="mt-8 flex gap-3 rounded-lg border border-[#d2ddd8] bg-[#f5f7f2] p-4 text-base leading-6 text-[#27312d]">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(event) => onAdultChange(event.target.checked)}
            className="mt-1 h-5 w-5 accent-[#0f766e]"
          />
          <span>{t("age.checkbox")}</span>
        </label>

        <p className="mt-4 min-h-6 text-sm text-[#6b3b34]" aria-live="polite">
          {!isAdult ? t("age.hint_before") : t("age.hint_after")}
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#aebdb7] px-5 text-sm font-semibold text-[#27312d] transition hover:bg-[#edf4f1] focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
          >
            {t("age.back")}
          </button>
          <button
            type="button"
            disabled={!canAdvanceFromAge(isAdult)}
            onClick={onContinue}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition enabled:hover:bg-[#0d625c] disabled:cursor-not-allowed disabled:bg-[#aebdb7] disabled:text-[#f8fbf9] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2"
          >
            {t("age.continue")}
          </button>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

function ConsentScreen({
  consent,
  onConsentChange,
  onBack,
  onContinue,
}: {
  consent: ConsentState;
  onConsentChange: (key: ConsentKey, value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const canContinue = canAdvanceFromConsent(consent);

  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#f4eef6] px-5 py-10">
      <section className="w-full max-w-3xl rounded-lg border border-[#d8c7df] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7c3aed]">
          {t("consent.step")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#181610] sm:text-4xl">
          {t("consent.heading")}
        </h1>
        <p className="mt-4 text-base leading-7 text-[#504856]">
          {t("consent.description")}
        </p>

        <div className="mt-8 space-y-3">
          {consentKeys.map((key) => (
            <label
              key={key}
              className="flex gap-3 rounded-lg border border-[#ddd2e4] bg-[#faf7fb] p-4 text-sm leading-6 text-[#2f2933] sm:text-base"
            >
              <input
                type="checkbox"
                checked={consent[key]}
                onChange={(event) =>
                  onConsentChange(key, event.target.checked)
                }
                className="mt-1 h-5 w-5 accent-[#7c3aed]"
              />
              <span>{t(`consent.items.${key}`)}</span>
            </label>
          ))}
        </div>

        <p className="mt-4 min-h-6 text-sm text-[#6b3b34]" aria-live="polite">
          {canContinue ? t("consent.hint_after") : t("consent.hint_before")}
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#bbaec3] px-5 text-sm font-semibold text-[#2f2933] transition hover:bg-[#f6eef9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          >
            {t("consent.back")}
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7c3aed] px-5 text-sm font-semibold text-white transition enabled:hover:bg-[#682fd0] disabled:cursor-not-allowed disabled:bg-[#c8bad1] disabled:text-[#fffaf2] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:ring-offset-2"
          >
            {t("consent.continue")}
          </button>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Ready
// ---------------------------------------------------------------------------

function ReadyScreen({
  onStartQuiz,
  onRestart,
}: {
  onStartQuiz: () => void;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#eef4f2] px-5 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-[#ccd8d4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
          {t("ready.eyebrow")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#181610] sm:text-4xl">
          {t("ready.heading")}
        </h1>
        <p className="mt-4 text-base leading-7 text-[#46534e]">
          {t("ready.description")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStartQuiz}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#0d625c] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2"
          >
            {t("ready.start_quiz")}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#aebdb7] px-5 text-sm font-semibold text-[#27312d] transition hover:bg-[#edf4f1] focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
          >
            {t("ready.restart")}
          </button>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

function QuizScreen({
  questions,
  currentIdx,
  answers,
  onAnswer,
  onPrevious,
  onNext,
}: {
  questions: QuestionWithText[];
  currentIdx: number;
  answers: Record<string, AnswerOption>;
  onAnswer: (questionId: string, option: AnswerOption) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const question = questions[currentIdx];
  if (!question) return null;

  const isLast = currentIdx === questions.length - 1;
  const selected = answers[question.id];

  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#f0f4f2] px-5 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-[#c5d5cf] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
            {t("quiz.progress", {
              current: currentIdx + 1,
              total: questions.length,
            })}
          </p>
          <div
            role="progressbar"
            aria-valuenow={currentIdx + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            className="mt-2 h-1.5 w-full rounded-full bg-[#d2ddd8]"
          >
            <div
              className="h-full rounded-full bg-[#0f766e] transition-all duration-300"
              style={{
                width: `${((currentIdx + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <h1 className="text-xl font-semibold leading-snug text-[#181610] sm:text-2xl">
          {question.text}
        </h1>

        <fieldset className="mt-6">
          <legend className="sr-only">{t("quiz.options_legend")}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUIZ_ANSWER_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm leading-5 transition ${
                  selected === option
                    ? "border-[#0f766e] bg-[#e8f3ef] font-semibold text-[#0f5249]"
                    : "border-[#d2ddd8] bg-[#f5f7f2] text-[#27312d] hover:border-[#0f766e]/50 hover:bg-[#edf4f1]"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option}
                  checked={selected === option}
                  onChange={() => onAnswer(question.id, option)}
                  className="h-4 w-4 accent-[#0f766e]"
                />
                <span>{t(`quiz.options.${option}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#aebdb7] px-5 text-sm font-semibold text-[#27312d] transition hover:bg-[#edf4f1] focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
          >
            {t("quiz.back")}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#0d625c] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2"
          >
            {isLast ? t("quiz.finish") : t("quiz.next")}
          </button>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function ResultsScreen({
  result,
  onRestart,
}: {
  result: ScoreResult;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  const dimensionEntries = Object.entries(result.dimensions) as [
    Dimension,
    number,
  ][];
  const prominentDimensions = getProminentDimensions(result.dimensions);

  return (
    <main className="min-h-[calc(100dvh-88px)] bg-[#f5f7f2] px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
          {t("results.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#181610] sm:text-4xl">
          {t("results.heading")}
        </h1>

        {/* Rule 1.1 — entertainment disclaimer required on every results screen */}
        <p className="mt-4 rounded-lg border border-[#d2ddd8] bg-white p-4 text-sm leading-6 text-[#46534e]">
          {t("results.disclaimer")}
        </p>

        <section className="mt-8" aria-label={t("results.heading")}>
          <p className="rounded-lg border border-[#c5d5cf] bg-[#eef8f5] p-4 text-base leading-7 text-[#27312d]">
            {t("results.insight_intro")}
          </p>
          {prominentDimensions.length > 0 && (
            <div className="mt-4 space-y-3">
              {prominentDimensions.map(([dim, score]) => (
                <article
                  key={dim}
                  className="rounded-lg border border-[#d2ddd8] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <h2 className="font-semibold text-[#181610]">
                      {t(`dimensions.${dim}`)}
                    </h2>
                    <span className="flex-shrink-0 text-[#46534e]">{score}/100</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#46534e]">
                    {t(`results.profile.${dim}`)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8" aria-labelledby="axes-heading">
          <h2
            id="axes-heading"
            className="text-base font-semibold text-[#181610]"
          >
            {t("results.section_axes")}
          </h2>
          <div className="mt-4 space-y-4">
            <ScoreBar
              label={t("results.curiosidad_label")}
              value={result.curiosidad}
            />
            <ScoreBar
              label={t("results.intencion_label")}
              value={result.intencion}
            />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="dimensions-heading">
          <h2
            id="dimensions-heading"
            className="text-base font-semibold text-[#181610]"
          >
            {t("results.section_dimensions")}
          </h2>
          <div className="mt-4 space-y-4">
            {dimensionEntries.length === 0 ? (
              <p className="text-sm text-[#46534e]">
                {t("results.no_dimensions")}
              </p>
            ) : (
              dimensionEntries.map(([dim, score]) => (
                <ScoreBar
                  key={dim}
                  label={t(`dimensions.${dim}`)}
                  value={score}
                />
              ))
            )}
          </div>
        </section>

        {/* Rule 1.6 — vetoed topics displayed ONLY as personal limits, never as recommendations */}
        <section className="mt-8" aria-labelledby="limits-heading">
          <h2
            id="limits-heading"
            className="text-base font-semibold text-[#181610]"
          >
            {t("results.section_limits")}
          </h2>
          <p className="mt-1 text-sm text-[#46534e]">
            {t("results.limits_intro")}
          </p>
          <div className="mt-3">
            {result.vetoedTopics.length === 0 ? (
              <p className="text-sm text-[#46534e]">{t("results.no_limits")}</p>
            ) : (
              <ul className="space-y-2">
                {result.vetoedTopics.map((topic) => (
                  <li
                    key={topic}
                    className="flex items-center gap-3 rounded-lg border border-[#e8d5d3] bg-white px-4 py-3 text-sm text-[#27312d]"
                  >
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#6b3b34]" />
                    {t(`topics.${topic}`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={onRestart}
          className="mt-10 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#181610] px-5 text-sm font-semibold text-white transition hover:bg-[#2e2a22] focus:outline-none focus:ring-2 focus:ring-[#181610] focus:ring-offset-2"
        >
          {t("results.restart")}
        </button>
      </div>
    </main>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-[#27312d]">{label}</span>
        <span className="text-[#46534e]">{value}/100</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-[#d2ddd8]">
        <div
          className="h-full rounded-full bg-[#0f766e] transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function SiteFooter({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  return (
    <footer className="flex flex-col gap-4 border-t border-[#d2ddd8] bg-[#101615] px-5 py-5 text-sm text-[#eef7f4] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
      <p>{t("footer.disclaimer")}</p>
      <div className="flex items-center gap-4">
        <LanguageSelector className="text-[#eef7f4]/70" />
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#eef7f4]/40 px-4 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#8ecdc2] focus:ring-offset-2 focus:ring-offset-[#101615]"
        >
          {t("footer.clear_data")}
        </button>
      </div>
    </footer>
  );
}
