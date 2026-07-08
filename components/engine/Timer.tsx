"use client";
import { useEffect, useRef, useState } from "react";
import "./engine.css";

function fmt(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return m >= 60 ? `${Math.floor(m / 60)}:${pad(m % 60)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function Timer({
  initialElapsedSec,
  countdownSec, // null = count up (practice); number = sealed mock budget
  onTick,
  onExpire,
  onPause,
}: {
  initialElapsedSec: number;
  countdownSec: number | null;
  onTick: (elapsedSec: number) => void;
  onExpire: () => void;
  onPause: () => void;
}) {
  const [elapsed, setElapsed] = useState(initialElapsedSec);
  const expired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return; // paused while hidden (elapsed-time model)
      setElapsed((e) => {
        const next = e + 1;
        onTick(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onTick]);

  // Fire expiry from an effect, NEVER from inside the setElapsed updater: onExpire triggers a parent
  // setState (finish -> results), and calling it during the updater (render phase) warns "cannot
  // update a component while rendering a different component". The expired ref keeps it one-shot.
  useEffect(() => {
    if (countdownSec !== null && elapsed >= countdownSec && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [elapsed, countdownSec, onExpire]);

  useEffect(() => {
    const handler = () => { if (document.hidden) onPause(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [onPause]);

  const shown = countdownSec !== null ? Math.max(0, countdownSec - elapsed) : elapsed;
  // role="timer" (Task 12 review, contract C4): exposes the live count to assistive tech + tests.
  return <span role="timer" className="timer">{fmt(shown)}</span>;
}
