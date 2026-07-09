import { beforeEach, describe, expect, it } from "vitest";
import { readPrefs, writePrefs, setPref, clearPrefs } from "./prefs";

const KEY = "certreps.prefs.v1";

beforeEach(() => localStorage.clear());

describe("prefs store", () => {
  it("defaults every notification pref to off when nothing is stored", () => {
    expect(readPrefs()).toEqual({ reminders: false, newCerts: false, weekly: false });
  });

  it("round-trips a written prefs object", () => {
    writePrefs({ reminders: true, newCerts: false, weekly: true });
    expect(readPrefs()).toEqual({ reminders: true, newCerts: false, weekly: true });
  });

  it("setPref flips one field, persists it, and leaves the others intact", () => {
    setPref("reminders", true);
    expect(readPrefs()).toEqual({ reminders: true, newCerts: false, weekly: false });
    const next = setPref("weekly", true);
    expect(next).toEqual({ reminders: true, newCerts: false, weekly: true });
    expect(readPrefs().weekly).toBe(true);
  });

  it("degrades field-by-field for a partial or corrupt store", () => {
    localStorage.setItem(KEY, JSON.stringify({ weekly: true, reminders: "yes" }));
    // weekly survives; the non-boolean reminders and the missing newCerts fall back to defaults.
    expect(readPrefs()).toEqual({ reminders: false, newCerts: false, weekly: true });

    localStorage.setItem(KEY, "not json");
    expect(readPrefs()).toEqual({ reminders: false, newCerts: false, weekly: false });
  });

  it("clearPrefs wipes the store back to defaults", () => {
    writePrefs({ reminders: true, newCerts: true, weekly: true });
    clearPrefs();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(readPrefs()).toEqual({ reminders: false, newCerts: false, weekly: false });
  });
});
