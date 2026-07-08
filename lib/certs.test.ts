import { describe, expect, it } from "vitest";
import { listCerts, getCert } from "./certs";
import { getBank, getMeta } from "./bank";

describe("cert registry", () => {
  it("lists exactly aip-c01 today, in registry order", () => {
    expect(listCerts().map((c) => c.certId)).toEqual(["aip-c01"]);
  });

  it("getCert returns the entry for a known cert", () => {
    const entry = getCert("aip-c01");
    expect(entry).not.toBeNull();
    expect(entry!.meta.certId).toBe("aip-c01");
    expect(entry!.bank.length).toBe(130);
  });

  it("getCert returns null for an unknown cert", () => {
    expect(getCert("nope")).toBeNull();
  });
});

describe("parameterized bank loader (back-compat pinned)", () => {
  it("getBank(certId) returns that cert's bank", () => {
    expect(getBank("aip-c01").length).toBe(130);
  });

  it("getBank() default arg is identical to getBank('aip-c01')", () => {
    expect(getBank()).toEqual(getBank("aip-c01"));
    expect(getBank().length).toBe(130);
  });

  it("getMeta() default and getMeta(certId) both resolve aip-c01", () => {
    expect(getMeta().certId).toBe("aip-c01");
    expect(getMeta("aip-c01").certId).toBe("aip-c01");
  });

  // The discriminating assertion: proves the loaders consult the registry
  // rather than ignoring their argument (the old no-arg loaders would not throw).
  it("getBank/getMeta throw for an unknown cert", () => {
    expect(() => getBank("nope")).toThrow(/unknown cert/i);
    expect(() => getMeta("nope")).toThrow(/unknown cert/i);
  });
});

describe("prototype-chain safety (review regression)", () => {
  it("returns null for inherited Object.prototype keys", () => {
    expect(getCert("toString")).toBeNull();
    expect(getCert("__proto__")).toBeNull();
    expect(getCert("hasOwnProperty")).toBeNull();
  });
  it("bank loaders throw loudly for prototype keys", () => {
    expect(() => getBank("constructor")).toThrow(/unknown cert/i);
  });
});
