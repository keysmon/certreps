import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, _resetRateLimit } from "./route";

function req(body: unknown, ip = "1.2.3.4"): Request {
  return new Request("http://test/api/report", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  _resetRateLimit();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/report", () => {
  it("accepts a valid report (202 when no GitHub token configured)", async () => {
    const res = await POST(req({ questionId: "aipc01-0001", note: "Option B seems also correct" }));
    expect(res.status).toBe(202);
  });
  it("rejects bad payloads", async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ questionId: "x".repeat(100), note: "hi" }))).status).toBe(400);
    expect((await POST(req({ questionId: "aipc01-0001", note: "x".repeat(3000) }))).status).toBe(400);
  });
  it("rate limits per IP", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(req({ questionId: "aipc01-0001", note: `note number ${i}` }))).status).toBe(202);
    }
    expect((await POST(req({ questionId: "aipc01-0001", note: "note six" }))).status).toBe(429);
    expect((await POST(req({ questionId: "aipc01-0001", note: "other machine" }, "5.6.7.8"))).status).toBe(202);
  });
  it("files a GitHub issue when configured", async () => {
    vi.stubEnv("REPORT_GITHUB_TOKEN", "t");
    vi.stubEnv("REPORT_GITHUB_REPO", "owner/repo");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));
    const res = await POST(req({ questionId: "aipc01-0002", note: "typo in stem" }));
    expect(res.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/issues",
      expect.objectContaining({ method: "POST" })
    );
  });
});
