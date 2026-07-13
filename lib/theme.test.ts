import { beforeEach, describe, expect, it } from "vitest";
import { getTheme, setTheme, applyTheme, THEMES, THEME_LABELS, type Theme } from "./theme";

const KEY = "certreps.theme";
const attr = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme store", () => {
  it("defaults to Signal Gold when nothing is stored", () => {
    expect(getTheme()).toBe("signal");
  });

  it("reads each stored alternate theme verbatim", () => {
    for (const t of ["ocean", "violet", "graphite", "day"] as Theme[]) {
      localStorage.setItem(KEY, t);
      expect(getTheme()).toBe(t);
    }
  });

  it("falls back to Signal Gold for an unrecognized stored value", () => {
    localStorage.setItem(KEY, "sepia");
    expect(getTheme()).toBe("signal");
  });

  it("migrates the legacy two-theme values (dark -> signal, light -> day)", () => {
    localStorage.setItem(KEY, "dark");
    expect(getTheme()).toBe("signal");
    localStorage.setItem(KEY, "light");
    expect(getTheme()).toBe("day");
  });

  it("applyTheme sets data-theme for the alternates and removes it for Signal Gold", () => {
    applyTheme("ocean");
    expect(attr()).toBe("ocean");
    applyTheme("day");
    expect(attr()).toBe("day");
    // Signal Gold is the default and carries NO attribute, matching the no-flash inline script.
    applyTheme("signal");
    expect(attr()).toBeNull();
  });

  it("setTheme persists the canonical name and applies the attribute", () => {
    setTheme("violet");
    expect(localStorage.getItem(KEY)).toBe("violet");
    expect(attr()).toBe("violet");

    setTheme("signal");
    expect(localStorage.getItem(KEY)).toBe("signal");
    expect(attr()).toBeNull();
  });

  it("every theme has a label and the set is exactly the five themes", () => {
    expect(THEMES).toEqual(["signal", "ocean", "violet", "graphite", "day"]);
    for (const t of THEMES) expect(THEME_LABELS[t]).toBeTruthy();
  });
});
