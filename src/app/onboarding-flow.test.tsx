import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import OnboardingFlow, {
  canAdvanceFromAge,
  canAdvanceFromConsent,
  initialConsentState,
} from "./onboarding-flow";

afterEach(() => {
  cleanup();
});

const appSources = [
  join(process.cwd(), "src", "app", "page.tsx"),
  join(process.cwd(), "src", "app", "layout.tsx"),
  join(process.cwd(), "src", "app", "onboarding-flow.tsx"),
];

async function moveToAgeGate() {
  const user = userEvent.setup();
  render(<OnboardingFlow />);
  await user.click(screen.getByRole("button", { name: /empezar/i }));
  return user;
}

async function moveToConsent() {
  const user = await moveToAgeGate();
  await user.click(
    screen.getByRole("checkbox", { name: /confirmo que tengo 18/i }),
  );
  await user.click(screen.getByRole("button", { name: /^continuar$/i }));
  return user;
}

describe("Curio onboarding", () => {
  it("rule-1.1-onboarding-frames-curio-as-entertainment-not-health", () => {
    render(<OnboardingFlow />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /descubre tu estilo de curiosidad/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/entretenimiento y autoexplor/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/no es salud/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/diagnostica tu/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /borrar datos/i })).toBeVisible();
  });

  it("rule-1.2-age-gate-blocks-until-18-is-confirmed", async () => {
    const user = await moveToAgeGate();

    expect(
      screen.getByRole("heading", { name: /confirma que tienes 18\+/i }),
    ).toBeInTheDocument();
    expect(canAdvanceFromAge(false)).toBe(false);

    const continueButton = screen.getByRole("button", { name: /^continuar$/i });
    expect(continueButton).toBeDisabled();
    expect(
      screen.queryByRole("heading", { name: /consentimiento antes de responder/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: /confirmo que tengo 18/i }),
    );

    expect(canAdvanceFromAge(true)).toBe(true);
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);

    expect(
      screen.getByRole("heading", { name: /consentimiento antes de responder/i }),
    ).toBeInTheDocument();
  });

  it("rule-1.2-explicit-consent-required-before-answering", async () => {
    const user = await moveToConsent();

    expect(canAdvanceFromConsent(initialConsentState)).toBe(false);

    const acceptButton = screen.getByRole("button", { name: /acepto y contin/i });
    expect(acceptButton).toBeDisabled();

    const consentCheckboxes = screen.getAllByRole("checkbox");
    expect(consentCheckboxes).toHaveLength(4);

    await user.click(consentCheckboxes[0]);
    expect(acceptButton).toBeDisabled();

    for (const checkbox of consentCheckboxes.slice(1)) {
      await user.click(checkbox);
    }

    expect(acceptButton).toBeEnabled();
    await user.click(acceptButton);

    expect(
      screen.getByRole("heading", { name: /ya puedes explorar con calma/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("rule-1.3-individual-mode-is-local-only-and-no-server-surfaces", () => {
    const source = appSources
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/navigator\.sendBeacon/);
    expect(source).not.toMatch(/localStorage|sessionStorage/);
    expect(source).not.toMatch(/cookies\s*\(/);
    expect(source).not.toMatch(/["']use server["']/);
    expect(source).not.toMatch(/\/api\//);
    expect(existsSync(join(process.cwd(), "src", "app", "api"))).toBe(false);
  });

  it("rule-1.8-no-analytics-or-error-payload-hooks-in-onboarding", () => {
    const source = appSources
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/plausible/i);
    expect(source).not.toMatch(/posthog/i);
    expect(source).not.toMatch(/analytics/i);
    expect(source).not.toMatch(/sentry/i);
    expect(source).not.toMatch(/captureException|captureMessage/);
    expect(source).not.toMatch(/console\.(log|info|warn|error)/);
  });
});
