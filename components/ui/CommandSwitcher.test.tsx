import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { listCerts } from "@/lib/certs";
import { CommandSwitcher } from "./CommandSwitcher";
import { getBank } from "@/lib/bank";
import { writeAll } from "@/lib/storage";
import type { Attempt, QuestionResult } from "@/lib/types";

// Enter navigates through the router; hoist the spy so the module-mock factory can close over it.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const AIP = "aip-c01"; // registry index 0 - "...Generative AI Developer - Professional"
const MLA = "mla-c01"; // registry index 1 - "...Machine Learning Engineer - Associate"
const AIP_TITLE = /Generative AI Developer/i;
const MLA_TITLE = /Machine Learning Engineer/i;

// Same storage idiom as CatalogClient.test: seed the real attempt store, let progress-view read it.
function attempt(over: Partial<Attempt>): Attempt {
  return {
    attemptId: `a-${Math.random().toString(36).slice(2)}`,
    certId: AIP,
    mode: "mock",
    questionIds: [],
    results: {},
    startedAt: 1_700_000_000_000,
    finishedAt: null,
    elapsedSec: 0,
    pauseCount: 0,
    ...over,
  };
}

// A finished mock graded to 100% (>= either pass line) -> status "Ready" -> hasProgress.
function passingMock(certId: string): Attempt {
  const ids = getBank(certId).slice(0, 20).map((q) => q.id);
  const results: Record<string, QuestionResult> = {};
  for (const id of ids) results[id] = { questionId: id, chosen: [], correct: true, flagged: false };
  return attempt({ certId, mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000 });
}

function trigger() {
  return screen.getByRole("button", { name: /switch certification/i });
}

beforeEach(() => {
  localStorage.clear();
  push.mockClear();
});

describe("CommandSwitcher", () => {
  it("renders a trigger reflecting the first registry cert when there is no history", () => {
    render(<CommandSwitcher />);
    expect(trigger()).toHaveTextContent(AIP_TITLE);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog on trigger click and moves focus into the input", async () => {
    render(<CommandSwitcher />);
    await userEvent.click(trigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("toggles open and closed on Cmd+K", async () => {
    render(<CommandSwitcher />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters certs by case-insensitive substring and shows an N MATCHES label", async () => {
    render(<CommandSwitcher />);
    await userEvent.click(trigger());
    await userEvent.type(screen.getByRole("combobox"), "machine");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(MLA_TITLE);
    expect(screen.getByText(/1 MATCHES/)).toBeInTheDocument();
  });

  it("arrow-navigates the rows and Enter routes to the active cert", async () => {
    render(<CommandSwitcher />);
    await userEvent.click(trigger());
    // No history -> registry order [aip, mla], active starts at 0.
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/aws/mla-c01");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<CommandSwitcher />);
    const t = trigger();
    await userEvent.click(t);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(t).toHaveFocus();
  });

  it("orders certs-with-progress first under a CONTINUE label with a gold resume meta", async () => {
    writeAll([passingMock(MLA)]); // mla is Ready (100%), aip untouched
    render(<CommandSwitcher />);
    await userEvent.click(trigger());
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(Math.min(listCerts().length, 12));
    // Cert with progress (mla) sorts ahead of the untouched aip.
    expect(options[0]).toHaveTextContent(MLA_TITLE);
    expect(options[0]).toHaveTextContent(/100%/);
    expect(options[0]).toHaveTextContent(/resume/i);
    expect(options[1]).toHaveTextContent(AIP_TITLE);
    expect(options[1]).toHaveTextContent(/AIP-C01/); // no progress -> exam code, not a resume meta
    expect(screen.getByText("CONTINUE")).toBeInTheDocument();
  });

  it("reflects the most-recently-active cert in the trigger after hydration", async () => {
    writeAll([passingMock(MLA)]);
    render(<CommandSwitcher />);
    await waitFor(() => expect(trigger()).toHaveTextContent(MLA_TITLE));
  });

  it("wires the combobox/listbox aria pattern with aria-activedescendant tracking the active row", async () => {
    render(<CommandSwitcher />);
    await userEvent.click(trigger());
    const input = screen.getByRole("combobox");
    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);

    await userEvent.keyboard("{ArrowDown}");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);
  });
});
