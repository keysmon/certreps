"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import type {Incident} from "./incidents";
import {incidentVersion, newIncidentRun, type IncidentRun} from "./incident-progress";
import {readIncidentRuns, writeIncidentRun, pullIncidentProgress, flushIncidentRun, incidentNeedsSync, incidentDeviceSaved} from "./incident-store";
import {useSession} from "./supabase/useSession";
export type IncidentSaveStatus = "loading" | "device" | "saving" | "synced" | "offline" | "error";
type View = {scope: string | null; run: IncidentRun | null; status: IncidentSaveStatus; message: string | null};
export function useIncidentProgress(incident: Incident) {
  const {session, loading, error: sessionError} = useSession();
  const scope = loading || sessionError ? null : session?.user.id ?? "guest";
  const activeScope = useRef(scope); activeScope.current = scope;
  const [view, setView] = useState<View>({scope:null, run:null, status:"loading", message:null});
  const [retryCount, setRetryCount] = useState(0);
  const version = incidentVersion(incident);
  useEffect(() => {
    if (!scope) return;
    let active = true;
    const current = () => active && activeScope.current === scope;
    const cached = () => readIncidentRuns(scope).find(run => run.incidentId === incident.id) ?? null;
    const show = (status: IncidentSaveStatus, message: string | null = null) => { if (current()) setView({scope, run: cached(), status, message}); };
    const refreshCache = () => {
      if (!current()) return;
      setView(previous => ({scope, run:cached(), status: scope === "guest" ? (incidentDeviceSaved(scope) ? "device" : "error") : incidentNeedsSync(scope,incident.id) ? (previous.status === "offline" || previous.status === "error" ? previous.status : "saving") : "synced", message:previous.message}));
    };
    const load = async () => {
      show("loading");
      if (sessionError) { show("error",sessionError); return; }
      if (scope === "guest") {
        if (!cached()) writeIncidentRun(scope,newIncidentRun(incident));
        show(incidentDeviceSaved(scope) ? "device" : "error",incidentDeviceSaved(scope) ? null : "Device storage is unavailable. Keep this page open to retain this case.");
        return;
      }
      try {
        await pullIncidentProgress(scope);
        if (!current()) return;
        if (!cached()) writeIncidentRun(scope,newIncidentRun(incident));
        if (incidentNeedsSync(scope,incident.id)) await flushIncidentRun(scope,incident.id);
        show("synced");
      } catch (error) {
        show(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",error instanceof Error ? error.message : "Could not sync this case. Your device copy is kept.");
      }
    };
    window.addEventListener("certreps:incidents-changed",refreshCache);
    const onStorage = (event:StorageEvent) => { if (event.key === null || event.key?.startsWith("certreps.incidents.v1.")) refreshCache(); };
    window.addEventListener("storage",onStorage);
    window.addEventListener("focus",load);
    window.addEventListener("online",load);
    void load();
    return () => {active=false;window.removeEventListener("certreps:incidents-changed",refreshCache);window.removeEventListener("storage",onStorage);window.removeEventListener("focus",load);window.removeEventListener("online",load);};
  },[scope,sessionError,incident,version,retryCount]);
  const flush = useCallback(async ():Promise<boolean> => {
    if (!scope || activeScope.current !== scope) return false;
    if (scope === "guest") return incidentDeviceSaved(scope);
    setView(previous => ({...previous,status:"saving",message:null}));
    try {
      await flushIncidentRun(scope,incident.id);
      if (activeScope.current !== scope) return false;
      setView({scope,run:readIncidentRuns(scope).find(run=>run.incidentId===incident.id)??null,status:"synced",message:null});
      return true;
    } catch (error) {
      if (activeScope.current === scope) setView(previous=>({...previous,status:typeof navigator!=="undefined"&&!navigator.onLine?"offline":"error",message:error instanceof Error?error.message:"Could not sync this case. Your device copy is kept."}));
      return false;
    }
  },[scope,incident.id]);
  const save = useCallback(async (run:IncidentRun):Promise<boolean> => {
    if (!scope || activeScope.current !== scope || run.incidentId !== incident.id) return false;
    const updated={...run,updatedAt:new Date().toISOString()};
    writeIncidentRun(scope,updated);
    if (scope === "guest") {
      setView({scope,run:updated,status:incidentDeviceSaved(scope)?"device":"error",message:incidentDeviceSaved(scope)?null:"Device storage is unavailable. Keep this page open to retain this case."});
      return incidentDeviceSaved(scope);
    }
    return flush();
  },[scope,incident.id,flush]);
  const replay = useCallback(async () => {
    if (!scope) return;
    const old=readIncidentRuns(scope).find(run=>run.incidentId===incident.id);
    const run=newIncidentRun(incident);
    if (scope!=="guest") run.pendingReset={expectedRunId:old?.pendingReset ? old.pendingReset.expectedRunId : old?.runId??null};
    await save(run);
  },[scope,incident,save]);
  const visible=sessionError ? {scope:null,run:null,status:"error" as const,message:sessionError} : view.scope===scope ? view : {scope,run:null,status:"loading" as const,message:null};
  return {...visible,deviceSaved:scope ? incidentDeviceSaved(scope) : false,account:scope!==null&&scope!=="guest",save,replay,flush,retry:()=>setRetryCount(value=>value+1)};
}
