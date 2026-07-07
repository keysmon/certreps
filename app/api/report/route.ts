import { NextResponse } from "next/server";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

export function _resetRateLimit(): void {
  hits.clear();
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { questionId?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!/^[a-z0-9-]{4,40}$/.test(questionId) || note.length < 3 || note.length > 2000) {
    return NextResponse.json({ error: "invalid report" }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "too many reports, try later" }, { status: 429 });
  }

  const token = process.env.REPORT_GITHUB_TOKEN;
  const repo = process.env.REPORT_GITHUB_REPO;
  if (token && repo) {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `Question report: ${questionId}`,
        body: `Anonymous report for \`${questionId}\`:\n\n> ${note.replace(/\n/g, "\n> ")}`,
        labels: ["question-report"],
      }),
    });
    if (res.ok) return NextResponse.json({ ok: true }, { status: 201 });
    console.error("report: GitHub issue failed", res.status);
  } else {
    console.log("report (no GitHub configured):", questionId, note.slice(0, 200));
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
