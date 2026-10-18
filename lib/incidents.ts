import cases from "@/content/aip-c01/incidents.json";
export interface Incident {
  id: string;
  title: string;
  domain: string;
  summary: string;
  minutes: number;
  evidence: {label: string; body: string}[];
  steps: {id: string; prompt: string; options: string[]; correct: number; explanations: string[]}[];
  debrief: string;
  sources: {label: string; url: string}[];
  reviewedOn: string;
}
export function listIncidents(): Incident[] { return cases; }
export function getIncident(id: string): Incident | undefined { return cases.find(item => item.id === id); }
