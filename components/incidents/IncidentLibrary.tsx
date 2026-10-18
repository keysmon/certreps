"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Incident } from '@/lib/incidents';
import { incidentVersion, type IncidentRun } from '@/lib/incident-progress';
import { readIncidentRuns, pullIncidentProgress, flushIncidentRun, incidentNeedsSync } from '@/lib/incident-store';
import { useSession } from '@/lib/supabase/useSession';

type Snapshot = { scope: string; runs: IncidentRun[]; message: string };

export function IncidentLibrary({ incidents }: { incidents: Incident[] }) {
  const { session, loading, error } = useSession();
  const scope = loading || error ? null : session?.user.id ?? 'guest';
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const visible = snapshot?.scope === scope ? snapshot : null;

  useEffect(() => {
    if (!scope) return;
    let active = true;
    let refreshing = false;
    let message = scope === 'guest' ? 'Guest case progress stays on this device.' : 'Checking account progress...';
    const read = () => {
      if (active) setSnapshot({ scope, runs: readIncidentRuns(scope), message });
    };
    const refresh = async () => {
      if (!active || refreshing) return;
      if (scope === 'guest') { read(); return; }
      refreshing = true;
      let failed = false;
      try {
        try { await pullIncidentProgress(scope); } catch { failed = true; }
        if (!active) return;
        const pending = readIncidentRuns(scope).filter(run => {
          const incident = incidents.find(item => item.id === run.incidentId);
          return incident && run.contentVersion === incidentVersion(incident) && incidentNeedsSync(scope, run.incidentId);
        });
        const results = await Promise.allSettled(pending.map(run => flushIncidentRun(scope, run.incidentId)));
        if (!active) return;
        failed ||= results.some(result => result.status === 'rejected');
        message = failed
          ? 'Account sync unavailable. Device progress is shown; reconnect or reopen the case to retry.'
          : 'Account progress checked. Cases sync when connected.';
        read();
      } finally { refreshing = false; }
    };
    const refreshFromEvent = () => { read(); void refresh(); };
    read();
    void refresh();
    window.addEventListener('storage', read);
    window.addEventListener('certreps:incidents-changed', read);
    window.addEventListener('focus', refreshFromEvent);
    window.addEventListener('online', refreshFromEvent);
    return () => {
      active = false;
      window.removeEventListener('storage', read);
      window.removeEventListener('certreps:incidents-changed', read);
      window.removeEventListener('focus', refreshFromEvent);
      window.removeEventListener('online', refreshFromEvent);
    };
  }, [scope, incidents]);

  return <>
    <p className="learning-muted" role="status">{loading ? 'Checking your account...' : error ?? visible?.message ?? 'Loading saved cases...'}</p>
    <div className="learning-grid">{incidents.map(incident => {
      const run = visible?.runs.find(item => item.incidentId === incident.id);
      const oldVersion = !!run && run.contentVersion !== incidentVersion(incident);
      const completed = !!run && !oldVersion && run.cursor === incident.steps.length;
      const action = !scope ? 'Open case' : oldVersion ? 'Review updated case' : completed ? 'View debrief' : run ? 'Resume case' : 'Start case';
      return <article className="learning-panel" key={incident.id}>
        <p className="eyebrow">{incident.domain}</p>
        <h2>{incident.title}</h2>
        <p>{incident.summary}</p>
        <p className="learning-muted">About {incident.minutes} minutes / {incident.steps.length} checkpoints</p>
        {oldVersion ? <p>Case updated. Open it to reset your saved progress for the new version.</p> : run ? <p>{Object.keys(run.answers).length} of {incident.steps.length} checkpoints checked</p> : null}
        <Link className="btn btn-ghost" href={`/aws/aip-c01/incidents/${incident.id}`}>{action}</Link>
      </article>;
    })}</div>
  </>;
}
