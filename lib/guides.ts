import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content");

export interface GuideRef { slug: string; title: string; }

export function listGuides(certId: string): GuideRef[] {
  const dir = path.join(ROOT, certId, "guides");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const first = fs.readFileSync(path.join(dir, f), "utf8").split("\n")[0] ?? "";
      return { slug, title: first.replace(/^#\s*/, "").trim() || slug };
    });
}

export function getGuide(certId: string, slug: string): string | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const p = path.join(ROOT, certId, "guides", `${slug}.md`);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}
