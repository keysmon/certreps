import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CertMeta } from "@/lib/types";
import { Button } from "./Button";
import { Pill } from "./Pill";
import { VendorDot, VENDORS } from "./VendorDot";
import { CertCard } from "./CertCard";
import { ScoreRing } from "./ScoreRing";
import { DomainBars } from "./DomainBars";
import { OptionRow } from "./OptionRow";

// Glyph constants match the ASCII-source convention (Results.tsx): the JSX source has
// literal unicode, ported to fromCharCode so the file stays pure-ASCII.
const CHECK = String.fromCharCode(10003); // U+2713
const CROSS = String.fromCharCode(10007); // U+2717

// A minimal CertMeta slice - the fields CertCard actually consumes. Real vendor
// values are human-readable ("AWS"), not the lowercase VENDORS slug.
const meta: Pick<CertMeta, "certId" | "vendor" | "examCode" | "title" | "level"> = {
  certId: "aip-c01",
  vendor: "AWS",
  examCode: "AIP-C01",
  title: "AWS Certified Generative AI Developer - Professional",
  level: "Professional",
};

describe("Button", () => {
  it("renders a <button> with the primary gold treatment by default", () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.getAttribute("style")).toContain("var(--gold)");
    expect(btn.getAttribute("style")).toContain("var(--shadow-gold)");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("renders the ghost and danger variants with their borders", () => {
    const { rerender } = render(<Button variant="ghost">G</Button>);
    expect(screen.getByRole("button", { name: "G" }).getAttribute("style")).toContain("var(--line-strong)");
    rerender(<Button variant="danger">D</Button>);
    expect(screen.getByRole("button", { name: "D" }).getAttribute("style")).toContain("var(--rose)");
  });

  it("renders an anchor when href is set and not disabled", () => {
    render(<Button href="/catalog">Browse</Button>);
    const link = screen.getByRole("link", { name: "Browse" });
    expect(link).toHaveAttribute("href", "/catalog");
    expect(link.tagName).toBe("A");
  });

  it("renders a disabled <button> (never an anchor) when href AND disabled are both set", () => {
    render(<Button href="/catalog" disabled>Browse</Button>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Browse" });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute("style")).toContain("var(--panel-3)");
    expect(btn.getAttribute("style")).toContain("var(--faint)");
  });

  it("fires onClick when enabled and stays inert when disabled", async () => {
    const onEnabled = vi.fn();
    const onDisabled = vi.fn();
    const { rerender } = render(<Button onClick={onEnabled}>Fire</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Fire" }));
    expect(onEnabled).toHaveBeenCalledTimes(1);
    rerender(<Button onClick={onDisabled} disabled>Fire</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Fire" }));
    expect(onDisabled).not.toHaveBeenCalled();
  });
});

describe("Pill", () => {
  it("renders children and applies each tone", () => {
    const { rerender } = render(<Pill>Default</Pill>);
    expect(screen.getByText("Default").getAttribute("style")).toContain("var(--muted)");
    rerender(<Pill tone="level">Pro</Pill>);
    expect(screen.getByText("Pro").getAttribute("style")).toContain("var(--gold-soft)");
    rerender(<Pill tone="good">Above</Pill>);
    expect(screen.getByText("Above").getAttribute("style")).toContain("var(--emerald-soft)");
    rerender(<Pill tone="bad">Weak</Pill>);
    expect(screen.getByText("Weak").getAttribute("style")).toContain("var(--rose-soft)");
  });
});

describe("VendorDot", () => {
  it("exports a typed VENDORS accent map keyed by lowercase slug", () => {
    expect(VENDORS.aws).toEqual({ n: "AWS", c: "var(--v-aws)" });
    expect(VENDORS.azure.c).toBe("var(--v-azure)");
    expect(Object.keys(VENDORS)).toEqual(
      expect.arrayContaining(["aws", "azure", "ms", "gcp", "comptia", "k8s", "hashi", "cisco"]),
    );
  });

  it("renders a sized dot with the given color", () => {
    const { container } = render(<VendorDot color="var(--v-aws)" size={12} />);
    const dot = container.querySelector("span")!;
    const style = dot.getAttribute("style")!;
    expect(style).toContain("var(--v-aws)");
    expect(style).toContain("12px");
  });
});

describe("CertCard", () => {
  it("links to href with the cert title as its accessible name, and shows vendor/code/level", () => {
    render(<CertCard meta={meta} href="/aws/aip-c01" questions={65} />);
    const link = screen.getByRole("link", { name: meta.title });
    expect(link).toHaveAttribute("href", "/aws/aip-c01");
    expect(screen.getByText("AWS")).toBeInTheDocument();
    expect(screen.getByText("AIP-C01")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
  });

  it("shows the zero-progress footer (question count + Practice) with no fake stars or learners", () => {
    render(<CertCard meta={meta} href="/aws/aip-c01" questions={65} />);
    expect(screen.getByText(/Practice/)).toBeInTheDocument();
    expect(screen.getByText(/65\s*Q/)).toBeInTheDocument();
    expect(screen.queryByText(/Resume/)).not.toBeInTheDocument();
    // Honesty: the prototype's fabricated star row is dropped entirely.
    expect(screen.queryByText(/[★☆]/)).not.toBeInTheDocument();
  });

  it("shows the progress footer (percent + Resume) when progress > 0", () => {
    render(<CertCard meta={meta} href="/aws/aip-c01" questions={65} progress={40} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText(/Resume/)).toBeInTheDocument();
    expect(screen.queryByText(/Practice/)).not.toBeInTheDocument();
  });
});

describe("ScoreRing", () => {
  function progressStroke(container: HTMLElement) {
    // Two circles: [0] track, [1] the colored progress arc.
    return container.querySelectorAll("circle")[1].getAttribute("stroke");
  }

  it("colors the arc by the 72/50 bands", () => {
    const above = render(<ScoreRing pct={72} />);
    expect(progressStroke(above.container)).toBe("var(--emerald)");
    const mid = render(<ScoreRing pct={50} />);
    expect(progressStroke(mid.container)).toBe("var(--gold)");
    const below = render(<ScoreRing pct={49} />);
    expect(progressStroke(below.container)).toBe("var(--rose)");
  });

  it("marks the SVG decorative and exposes an sr-only textual score", () => {
    const { container } = render(<ScoreRing pct={72} correct={50} total={65} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).toBeTruthy();
    expect(srOnly!.textContent).toContain("72%");
    expect(srOnly!.textContent).toContain("50 of 65 correct");
  });
});

describe("DomainBars", () => {
  it("renders the title and row names", () => {
    render(<DomainBars rows={[{ name: "Fundamentals", pct: 90 }]} />);
    expect(screen.getByText("Performance by domain")).toBeInTheDocument();
    expect(screen.getByText("Fundamentals")).toBeInTheDocument();
  });

  it("lets an explicit verdict + color from the caller beat the internal fallback (C10)", () => {
    render(
      <DomainBars
        rows={[{ name: "Design", pct: 90, verdict: "Custom", color: "var(--sky)" }]}
      />,
    );
    // pct 90 would fall back to "Above"/emerald - the explicit values win.
    const verdict = screen.getByText("Custom");
    expect(verdict.getAttribute("style")).toContain("var(--sky)");
    expect(screen.queryByText("Above")).not.toBeInTheDocument();
  });

  it("falls back to the internal band when the caller omits verdict/color", () => {
    render(<DomainBars rows={[{ name: "Ops", pct: 90, correct: 9, total: 10 }]} />);
    const verdict = screen.getByText("Above");
    expect(verdict.getAttribute("style")).toContain("var(--emerald)");
    expect(screen.getByText("9/10")).toBeInTheDocument();
  });
});

describe("OptionRow", () => {
  it("shows the letter marker for idle/selected/dim states", () => {
    const { rerender } = render(<OptionRow letter="A" state="idle">Alpha</OptionRow>);
    expect(screen.getByText("A")).toBeInTheDocument();
    rerender(<OptionRow letter="B" state="selected">Beta</OptionRow>);
    const selected = screen.getByRole("button");
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(selected.getAttribute("style")).toContain("var(--gold)");
    rerender(<OptionRow letter="C" state="dim">Gamma</OptionRow>);
    expect(screen.getByRole("button").getAttribute("style")).toContain("opacity: 0.5");
  });

  it("shows a check glyph and emerald when correct", () => {
    render(<OptionRow letter="A" state="correct">Right</OptionRow>);
    expect(screen.getByText(CHECK)).toBeInTheDocument();
    expect(screen.getByRole("button").getAttribute("style")).toContain("var(--emerald)");
  });

  it("shows a cross glyph and rose when incorrect", () => {
    render(<OptionRow letter="A" state="incorrect">Wrong</OptionRow>);
    expect(screen.getByText(CROSS)).toBeInTheDocument();
    expect(screen.getByRole("button").getAttribute("style")).toContain("var(--rose)");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<OptionRow letter="A" onClick={onClick}>Pick</OptionRow>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
