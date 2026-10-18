import { beforeEach, describe, expect, it } from "vitest";
import { getTheme, setTheme, applyTheme, THEMES, THEME_LABELS, type Theme } from "./theme";

const KEY = "certreps.theme";
const attr = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme store", () => {
  it("defaults to Industrial when nothing is stored", () => {
    expect(getTheme()).toBe("industrial");
  });

  it("reads each stored alternate theme verbatim", () => {
    for (const t of ["ocean", "violet", "graphite", "day"] as Theme[]) {
      localStorage.setItem(KEY, t);
      expect(getTheme()).toBe(t);
    }
  });

  it("falls back to Industrial for an unrecognized stored value", () => {
    localStorage.setItem(KEY, "sepia");
    expect(getTheme()).toBe("industrial");
  });

  it("migrates the legacy two-theme values (dark -> signal, light -> day)", () => {
    localStorage.setItem(KEY, "dark");
    expect(getTheme()).toBe("signal");
    localStorage.setItem(KEY, "light");
    expect(getTheme()).toBe("day");
  });

  it("applyTheme sets data-theme for the alternates and removes it for Industrial", () => {
    applyTheme("ocean");
    expect(attr()).toBe("ocean");
    applyTheme("day");
    expect(attr()).toBe("day");
    // Signal Gold is explicit; Industrial clears the attribute, matching first paint.
    applyTheme("signal");
    expect(attr()).toBe("signal");
    applyTheme("industrial");
    expect(attr()).toBeNull();
  });

  it("setTheme persists the canonical name and applies the attribute", () => {
    setTheme("violet");
    expect(localStorage.getItem(KEY)).toBe("violet");
    expect(attr()).toBe("violet");

    setTheme("signal");
    expect(localStorage.getItem(KEY)).toBe("signal");
    expect(attr()).toBe("signal");
    setTheme("industrial");
    expect(getTheme()).toBe("industrial");
    expect(attr()).toBeNull();
  });

  it("every theme has a label and the set includes the new default and all saved legacy choices", () => {
    expect(THEMES).toEqual(["industrial", "signal", "ocean", "violet", "graphite", "day"]);
    for (const t of THEMES) expect(THEME_LABELS[t]).toBeTruthy();
  });
});
