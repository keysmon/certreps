import curricula from "@/content/curricula.json";
import notes from "@/content/aip-c01/answer-notes.json";
import type { Question } from "./types";
export interface LearningModule { domain: string; topics: string[]; objective: string; exercise: string; guideSlug?: string; }
export interface Curriculum { overview: string; prerequisites: string[]; modules: LearningModule[]; sources: {label: string; url: string}[]; reviewedOn: string; }
export function getCurriculum(certId: string): Curriculum | undefined {
  return Object.hasOwn(curricula, certId) ? (curricula as Record<string, Curriculum>)[certId] : undefined;
}
export function getAnswerNote(certId: string | undefined, questionId: string): {takeaway: string; options: string[]} | undefined {
  return certId === "aip-c01" && Object.hasOwn(notes, questionId) ? (notes as Record<string, {takeaway: string; options: string[]}>)[questionId] : undefined;
}
export function lessonForQuestion(certId: string, vendorSlug: string, question: Pick<Question, "domain">) {
  const curriculum = getCurriculum(certId);
  const index = curriculum?.modules.findIndex(m => m.domain === question.domain) ?? -1;
  const module = index >= 0 ? curriculum?.modules[index] : undefined;
  return module?.guideSlug ? {href: `/guides/${certId}/${module.guideSlug}`, label: "Read the related lesson"} : {href: `/${vendorSlug}/${certId}/learn${index >= 0 ? `#domain-${index + 1}` : ""}`, label: "Explore the topic outline"};
}
