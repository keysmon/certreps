import {notFound} from "next/navigation";
import {getIncident, listIncidents} from "@/lib/incidents";
import {IncidentRunner} from "@/components/incidents/IncidentRunner";
export function generateStaticParams() {return listIncidents().map(item => ({incidentId: item.id}));}
export async function generateMetadata({params}: {params: Promise<{incidentId: string}>}) {const {incidentId} = await params;const incident=getIncident(incidentId);return incident ? {title: `${incident.title} - incident challenge`,description: incident.summary} : {};}
export default async function IncidentPage({params}: {params: Promise<{incidentId: string}>}) {
 const {incidentId}=await params;const incident=getIncident(incidentId);if(!incident)notFound();return <IncidentRunner key={incident.id} incident={incident}/>;
}
