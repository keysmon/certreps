"use client";
import { useState } from "react";

export function ReportProblem({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, note }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <p style={{ fontSize: 12.5, color: "var(--emerald)" }}>Thanks - report received.</p>;
  if (!open) {
    return (
      // --muted (not --faint): the collapsed trigger renders on .explain's --panel background;
      // --faint-on-panel is 4.07:1 (fails AA), --muted is 4.6:1+ (passes). Approved a11y deviation from plan.
      <button type="button" onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
        Report a problem with this question
      </button>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        aria-label="Describe the question issue"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What's wrong? (e.g. answer key, outdated service name, typo)"
        rows={3}
        maxLength={2000}
        style={{ width: "100%", background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, fontFamily: "var(--font-sans)", fontSize: 13.5 }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 13 }} disabled={note.trim().length < 3 || state === "sending"} onClick={send}>
          {state === "sending" ? "Sending..." : "Send report"}
        </button>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {state === "error" && <p style={{ fontSize: 12.5, color: "var(--rose)" }}>Could not send - try again later.</p>}
    </div>
  );
}
