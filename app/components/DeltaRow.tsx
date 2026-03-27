'use client';

import { useEffect, useState } from 'react';

// Per-field entry stored in localStorage
type Snap = Record<string, { ts: number; v: number }>;

const SNAP_KEY = 'freak-hub-snap';
const DAY_MS   = 24 * 60 * 60 * 1000;

function load(): Snap {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) ?? '{}'); }
  catch { return {}; }
}
function save(s: Snap) {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(s)); } catch {}
}

function Chip({ delta }: { delta: number }) {
  const up = delta >= 0;
  const n  = Math.round(Math.abs(delta)).toLocaleString('en-US');
  return (
    <span className={`font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
      {up ? '▲' : '▼'} {up ? '+' : '-'}{n}
    </span>
  );
}

export default function DeltaRow({
  field,
  current,
  serverDelta,
}: {
  field: string;       // e.g. "staked", "total_burned"
  current: number;
  serverDelta: number | null;
}) {
  // Initialise with serverDelta so the first SSR-matched paint is correct
  // when the server did have snapshot data.
  const [delta, setDelta] = useState<number | null>(serverDelta);

  useEffect(() => {
    // Server snapshot takes priority — no localStorage work needed
    if (serverDelta !== null) {
      setDelta(serverDelta);
      return;
    }

    // ── localStorage fallback ──────────────────────────────────────────────
    const snap  = load();
    const entry = snap[field];
    const now   = Date.now();

    if (entry && now - entry.ts < DAY_MS * 2) {
      // Stored baseline is recent enough — show delta
      setDelta(current - entry.v);
    } else {
      // No stored baseline yet — show 0 and seed
      setDelta(0);
    }

    // Rotate baseline every 24 h
    if (!entry || now - entry.ts > DAY_MS) {
      save({ ...snap, [field]: { ts: now, v: current } });
    }
  }, [field, current, serverDelta]);

  if (delta === null) return null;

  return (
    <span className="text-zinc-500 text-xs flex items-center gap-1">
      24h: <Chip delta={delta} />
    </span>
  );
}
