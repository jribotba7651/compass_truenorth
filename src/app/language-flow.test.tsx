import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import OnboardingFlow from "./onboarding-flow";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
});

// Footer always renders — use it as the stable selector anchor.
function getLangGroup() {
  return screen.getByRole("group", { name: /language|idioma/i });
}

async function switchToEN(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(getLangGroup()).getByRole("button", { name: /^en$/i }));
}

async function switchToES(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(getLangGroup()).getByRole("button", { name: /^es$/i }));
}

describe("i18n language selector (Section 9)", () => {
  it("selector renders in the footer on the landing screen", () => {
    render(<OnboardingFlow />);
    const group = getLangGroup();
    expect(within(group).getByRole("button", { name: /^en$/i })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: /^es$/i })).toBeInTheDocument();
  });

  it("default locale is ES — landing shows Spanish headline", () => {
    render(<OnboardingFlow />);
    expect(
      screen.getByRole("heading", { level: 1, name: /descubre tu estilo/i }),
    ).toBeInTheDocument();
  });

  it("switching to EN updates landing headline", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await switchToEN(user);
    expect(
      screen.getByRole("heading", { level: 1, name: /discover your intimate/i }),
    ).toBeInTheDocument();
  });

  it("switching back to ES restores Spanish headline", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await switchToEN(user);
    await switchToES(user);
    expect(
      screen.getByRole("heading", { level: 1, name: /descubre tu estilo/i }),
    ).toBeInTheDocument();
  });

  it("language change does not reset step — age gate stays on age gate", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);

    await user.click(screen.getByRole("button", { name: /empezar|get started/i }));
    expect(screen.getByRole("heading", { name: /18\+/i })).toBeInTheDocument();

    await switchToEN(user);

    // Still on age gate, not reset to landing
    expect(screen.getByRole("heading", { name: /18\+/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /empezar|get started/i }),
    ).not.toBeInTheDocument();
  });

  it("language change translates age gate UI to EN without resetting checkbox", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);

    await user.click(screen.getByRole("button", { name: /empezar/i }));
    const checkbox = screen.getByRole("checkbox", { name: /confirmo que tengo 18/i });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await switchToEN(user);

    expect(
      screen.getByRole("heading", { name: /confirm you're 18\+/i }),
    ).toBeInTheDocument();
    // The checkbox element is the same — state preserved
    expect(checkbox).toBeChecked();
  });

  it("language change does not reset consent checkboxes", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);

    // Navigate to consent
    await user.click(screen.getByRole("button", { name: /empezar/i }));
    await user.click(screen.getByRole("checkbox", { name: /confirmo que tengo 18/i }));
    await user.click(screen.getByRole("button", { name: /^continuar$/i }));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    await switchToEN(user);

    // Checkbox state preserved across language switch
    const checkboxesAfter = screen.getAllByRole("checkbox");
    expect(checkboxesAfter[0]).toBeChecked();
    // Other three remain unchecked
    for (const cb of checkboxesAfter.slice(1)) {
      expect(cb).not.toBeChecked();
    }
  });

  it("EN consent screen still blocks until all 4 are checked", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);

    await user.click(screen.getByRole("button", { name: /empezar/i }));
    await user.click(screen.getByRole("checkbox", { name: /confirmo que tengo 18/i }));
    await user.click(screen.getByRole("button", { name: /^continuar$/i }));

    await switchToEN(user);

    const continueBtn = screen.getByRole("button", { name: /i consent/i });
    expect(continueBtn).toBeDisabled();

    for (const cb of screen.getAllByRole("checkbox")) {
      await user.click(cb);
    }
    expect(continueBtn).toBeEnabled();
  });

  it("language preference is persisted to localStorage", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await switchToEN(user);
    expect(localStorage.getItem("curio-lang")).toBe("en");
  });

  it("language preference switches back to ES and updates localStorage", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow />);
    await switchToEN(user);
    await switchToES(user);
    expect(localStorage.getItem("curio-lang")).toBe("es");
  });

  it("stored EN preference is loaded on mount — shows English headline", () => {
    localStorage.setItem("curio-lang", "en");
    render(<OnboardingFlow />);
    expect(
      screen.getByRole("heading", { level: 1, name: /discover your intimate/i }),
    ).toBeInTheDocument();
  });

  it("stored ES preference is loaded on mount — shows Spanish headline", () => {
    localStorage.setItem("curio-lang", "es");
    render(<OnboardingFlow />);
    expect(
      screen.getByRole("heading", { level: 1, name: /descubre tu estilo/i }),
    ).toBeInTheDocument();
  });
});
