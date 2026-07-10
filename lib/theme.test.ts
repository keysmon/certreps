import { beforeEach, describe, expect, it } from "vitest";
import { getTheme, setTheme, toggleTheme, applyTheme, type Theme } from "./theme";

const KEY = "certreps.theme";
const attr = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme store", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(getTheme()).toBe("dark");
  });

  it("reads a stored light theme", () => {
    localStorage.setItem(KEY, "light");
    expect(getTheme()).toBe("light");
  });

  it("falls back to dark for an unrecognized stored value", () => {
    localStorage.setItem(KEY, "sepia");
    expect(getTheme()).toBe("dark");
  });

  it("applyTheme adds data-theme=light for light and removes it for dark", () => {
    applyTheme("light");
    expect(attr()).toBe("light");
    applyTheme("dark");
    // Dark is the default and carries NO attribute, matching the no-flash inline script.
    expect(attr()).toBeNull();
  });

  it("setTheme persists the value and applies the attribute", () => {
    setTheme("light");
    expect(localStorage.getItem(KEY)).toBe("light");
    expect(attr()).toBe("light");

    setTheme("dark");
    expect(localStorage.getItem(KEY)).toBe("dark");
    expect(attr()).toBeNull();
  });

  it("toggleTheme flips dark->light->dark, persisting and applying each time", () => {
    const light: Theme = toggleTheme();
    expect(light).toBe("light");
    expect(getTheme()).toBe("light");
    expect(attr()).toBe("light");

    const dark: Theme = toggleTheme();
    expect(dark).toBe("dark");
    expect(getTheme()).toBe("dark");
    expect(attr()).toBeNull();
  });
});
