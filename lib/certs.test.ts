import { describe, expect, it } from "vitest";
import { VENDORS } from "@/components/ui/VendorDot";
import { listCerts, getCert } from "./certs";
import { getBank, getMeta } from "./bank";

describe("cert registry", () => {
  it("lists every registered cert in registry order", () => {
    expect(listCerts().map((c) => c.certId)).toEqual(["aip-c01", "mla-c01", "saa-c03", "clf-c02", "dva-c02", "sap-c02", "dea-c01", "soa-c03", "dop-c02", "scs-c03", "aif-c01", "ans-c01", "genai-engineer", "nca-genl", "genai-leader"]);
  });

  // URL-compat invariant: routing keys off vendorSlug, so slug drift silently moves an
  // indexed URL to a new vendor segment. AWS certs must stay under /aws/* forever; a
  // cert absent from this map is expected to be AWS (new non-AWS certs must be added
  // here consciously, in the same commit that registers them).
  it("pins every cert's vendor slug (AWS certs never move off /aws/*)", () => {
    const nonAws: Record<string, string> = {
      "genai-engineer": "databricks",
      "nca-genl": "nvidia",
      "genai-leader": "gcp",
    };
    for (const meta of listCerts()) {
      expect(`${meta.certId}:${meta.vendorSlug}`).toBe(`${meta.certId}:${nonAws[meta.certId] ?? "aws"}`);
    }
  });

  // The [vendor] segment, the VENDORS accent/name map, and AuthButton's suppression
  // regexes are coupled through vendorSlug: a cert whose slug is missing from VENDORS
  // renders fine but silently un-suppresses the bare auth strip (route-refactor review).
  it("every cert's vendorSlug is a registered VENDORS key in safe charset", () => {
    for (const meta of listCerts()) {
      expect(Object.keys(VENDORS)).toContain(meta.vendorSlug);
      expect(meta.vendorSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("getCert returns the entry for a known cert", () => {
    const entry = getCert("aip-c01");
    expect(entry).not.toBeNull();
    expect(entry!.meta.certId).toBe("aip-c01");
    expect(entry!.bank.length).toBe(266);
  });

  it("getCert returns null for an unknown cert", () => {
    expect(getCert("nope")).toBeNull();
  });
});

describe("parameterized bank loader (back-compat pinned)", () => {
  it("getBank(certId) returns that cert's bank", () => {
    expect(getBank("aip-c01").length).toBe(266);
  });

  it("getBank() default arg is identical to getBank('aip-c01')", () => {
    expect(getBank()).toEqual(getBank("aip-c01"));
    expect(getBank().length).toBe(266);
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

describe("mla-c01 registry entry", () => {
  it("resolves with a 65-question bank and matching meta", () => {
    const entry = getCert("mla-c01");
    expect(entry).not.toBeNull();
    expect(entry!.meta.certId).toBe("mla-c01");
    expect(entry!.meta.mockQuestionCount).toBe(65);
    expect(entry!.bank.length).toBe(65);
    expect(entry!.meta.domains.reduce((s, d) => s + d.mockCount, 0)).toBe(65);
  });
  it("getBank('mla-c01') serves the mla bank, default stays aip-c01", () => {
    expect(getBank("mla-c01").length).toBe(65);
    expect(getBank("mla-c01")[0].id).toMatch(/^mlac01-/);
    expect(getBank().length).toBe(266);
  });
});
