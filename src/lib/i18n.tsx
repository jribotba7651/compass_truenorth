"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

export type Locale = "en" | "es";

const dictionaries = { en, es } as const;

const STORAGE_KEY = "curio-lang";

function getNestedValue(obj: unknown, keys: string[]): string {
  let current = obj;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return keys.join(".");
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : keys.join(".");
}

// Lazy initializer — runs only on the client since this is a "use client" tree.
// typeof window guard keeps SSR safe (server renders with "es" default).
function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "es";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    // Storage unavailable — keep default
  }
  return "es";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable — preference not persisted
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let result = getNestedValue(dictionaries[locale], key.split("."));
      if (params) {
        result = result.replace(
          /\{\{(\w+)\}\}/g,
          (_, k) => String(params[k] ?? ""),
        );
      }
      return result;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LangProvider");
  return ctx;
}

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("lang_selector.label")}
      className={`flex items-center gap-1 text-xs font-semibold tracking-widest ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded px-1.5 py-0.5 transition ${locale === "en" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
      >
        {t("lang_selector.en")}
      </button>
      <span aria-hidden="true" className="opacity-30">
        |
      </span>
      <button
        type="button"
        onClick={() => setLocale("es")}
        aria-pressed={locale === "es"}
        className={`rounded px-1.5 py-0.5 transition ${locale === "es" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
      >
        {t("lang_selector.es")}
      </button>
    </div>
  );
}
