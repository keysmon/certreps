"use client";
import { useEffect, useRef, useState } from "react";

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
        if (countdownSec !== null && next >= countdownSec && !expired.current) {
          expired.current = true;
          onExpire();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdownSec, onExpire, onTick]);

  useEffect(() => {
    const handler = () => { if (document.hidden) onPause(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [onPause]);

  const shown = countdownSec !== null ? Math.max(0, countdownSec - elapsed) : elapsed;
  return <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{fmt(shown)}</span>;
}
