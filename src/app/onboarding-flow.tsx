"use client";

import { useState } from "react";

export type OnboardingStep = "landing" | "age" | "consent" | "ready";

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

const consentItems: Array<{
  key: ConsentKey;
  label: string;
}> = [
  {
    key: "adultEntertainment",
    label:
      "Entiendo que Curio es entretenimiento y autoexploracion para adultos; no es salud, diagnostico ni consejo medico o psicologico.",
  },
  {
    key: "voluntaryAnswers",
    label:
      "Acepto responder de forma voluntaria y puedo pausar, salir o no contestar cuando quiera.",
  },
  {
    key: "localOnly",
    label:
      "Entiendo que el modo individual es local-only: mis respuestas no se envian al servidor en este flujo.",
  },
  {
    key: "separateSharing",
    label:
      "Entiendo que compartir resultados requiere un consentimiento separado y nunca se condiciona a comprar.",
  },
];

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
  const [step, setStep] = useState<OnboardingStep>("landing");
  const [isAdult, setIsAdult] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(freshConsentState);

  function resetFlow() {
    setStep("landing");
    setIsAdult(false);
    setConsent(freshConsentState());
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
            if (canAdvanceFromAge(isAdult)) {
              setStep("consent");
            }
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
            if (canAdvanceFromConsent(consent)) {
              setStep("ready");
            }
          }}
        />
      )}
      {step === "ready" && <ReadyScreen onRestart={resetFlow} />}
      <SiteFooter onReset={resetFlow} />
    </div>
  );
}

function LandingScreen({ onStart }: { onStart: () => void }) {
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
            Curio / Mapa del Deseo
          </p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Descubre tu estilo de curiosidad intima en 2 minutos.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#eef7f4] sm:text-xl">
            Un espacio de entretenimiento y autoexploracion para adultos, hecho
            para convertir respuestas privadas en lenguaje claro y conversable.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#8ecdc2] px-6 text-base font-semibold text-[#101615] transition hover:bg-[#a8e2d8] focus:outline-none focus:ring-2 focus:ring-[#8ecdc2] focus:ring-offset-2 focus:ring-offset-[#101615]"
            >
              Empezar
            </button>
            <a
              href="#principios"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 px-6 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#101615]"
            >
              Ver principios
            </a>
          </div>
        </div>
      </section>

      <section
        id="principios"
        className="grid gap-5 px-5 py-8 sm:px-8 md:grid-cols-3 lg:px-14"
        aria-label="Principios de Curio"
      >
        <Principle
          title="Curiosidad, no diagnostico"
          body="Curio no es salud ni consejo medico o psicologico. El marco es curiosidad y conversacion adulta."
        />
        <Principle
          title="Privado por diseno"
          body="El modo individual se disena local-only: las respuestas viven en el navegador y no se mandan al servidor."
        />
        <Principle
          title="Consentimiento primero"
          body="Nadie avanza sin confirmar 18+ y aceptar responder voluntariamente. Compartir sera una decision separada."
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
  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#e8f3ef] px-5 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-[#bdd5ce] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
          Paso 1 de 2
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#181610] sm:text-4xl">
          Confirma que tienes 18+
        </h1>
        <p className="mt-4 text-base leading-7 text-[#46534e]">
          Curio es solo para adultos. Antes de continuar, necesitamos tu
          confirmacion explicita de edad.
        </p>

        <label className="mt-8 flex gap-3 rounded-lg border border-[#d2ddd8] bg-[#f5f7f2] p-4 text-base leading-6 text-[#27312d]">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(event) => onAdultChange(event.target.checked)}
            className="mt-1 h-5 w-5 accent-[#0f766e]"
          />
          <span>Confirmo que tengo 18 anos o mas.</span>
        </label>

        <p className="mt-4 min-h-6 text-sm text-[#6b3b34]" aria-live="polite">
          {!isAdult
            ? "Confirma tu edad para continuar."
            : "Edad confirmada para continuar al consentimiento."}
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#aebdb7] px-5 text-sm font-semibold text-[#27312d] transition hover:bg-[#edf4f1] focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={!canAdvanceFromAge(isAdult)}
            onClick={onContinue}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition enabled:hover:bg-[#0d625c] disabled:cursor-not-allowed disabled:bg-[#aebdb7] disabled:text-[#f8fbf9] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2"
          >
            Continuar
          </button>
        </div>
      </section>
    </main>
  );
}

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
  const canContinue = canAdvanceFromConsent(consent);

  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#f4eef6] px-5 py-10">
      <section className="w-full max-w-3xl rounded-lg border border-[#d8c7df] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7c3aed]">
          Paso 2 de 2
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#181610] sm:text-4xl">
          Consentimiento antes de responder
        </h1>
        <p className="mt-4 text-base leading-7 text-[#504856]">
          Responder en Curio debe ser una decision adulta, voluntaria y privada.
          Marca cada punto para continuar.
        </p>

        <div className="mt-8 space-y-3">
          {consentItems.map((item) => (
            <label
              key={item.key}
              className="flex gap-3 rounded-lg border border-[#ddd2e4] bg-[#faf7fb] p-4 text-sm leading-6 text-[#2f2933] sm:text-base"
            >
              <input
                type="checkbox"
                checked={consent[item.key]}
                onChange={(event) =>
                  onConsentChange(item.key, event.target.checked)
                }
                className="mt-1 h-5 w-5 accent-[#7c3aed]"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        <p className="mt-4 min-h-6 text-sm text-[#6b3b34]" aria-live="polite">
          {canContinue
            ? "Consentimiento explicito completo."
            : "Necesitas aceptar todos los puntos antes de contestar."}
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#bbaec3] px-5 text-sm font-semibold text-[#2f2933] transition hover:bg-[#f6eef9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7c3aed] px-5 text-sm font-semibold text-white transition enabled:hover:bg-[#682fd0] disabled:cursor-not-allowed disabled:bg-[#c8bad1] disabled:text-[#fffaf2] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:ring-offset-2"
          >
            Acepto y continuo
          </button>
        </div>
      </section>
    </main>
  );
}

function ReadyScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <main className="grid min-h-[calc(100dvh-88px)] place-items-center bg-[#eef4f2] px-5 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-[#ccd8d4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f766e]">
          Consentimiento listo
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#181610] sm:text-4xl">
          Ya puedes explorar con calma.
        </h1>
        <p className="mt-4 text-base leading-7 text-[#46534e]">
          No se ha guardado nada. Cuando empiece el quiz, tus respuestas
          individuales se quedan en tu navegador.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#181610] px-5 text-sm font-semibold text-white transition hover:bg-[#2e2a22] focus:outline-none focus:ring-2 focus:ring-[#181610] focus:ring-offset-2"
        >
          Volver al inicio
        </button>
      </section>
    </main>
  );
}

function SiteFooter({ onReset }: { onReset: () => void }) {
  return (
    <footer className="flex flex-col gap-4 border-t border-[#d2ddd8] bg-[#101615] px-5 py-5 text-sm text-[#eef7f4] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
      <p>
        Curio es entretenimiento y autoexploracion para adultos. No es salud,
        diagnostico ni consejo medico o psicologico.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#eef7f4]/40 px-4 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#8ecdc2] focus:ring-offset-2 focus:ring-offset-[#101615]"
      >
        Borrar datos
      </button>
    </footer>
  );
}
