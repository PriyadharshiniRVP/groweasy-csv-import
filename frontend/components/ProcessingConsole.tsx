'use client';

import { useEffect, useState } from 'react';

const LOG_LINES = [
  'reading csv buffer…',
  'inferring column semantics…',
  'batching source rows…',
  'sending batch to model…',
  'validating crm_status enum…',
  'validating data_source enum…',
  'checking created_at is Date-parseable…',
  'merging duplicate contact fields…',
];

export default function ProcessingConsole({ fileName }: { fileName: string }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        const next = [...prev, LOG_LINES[i % LOG_LINES.length]];
        return next.slice(-6); // keep the console short, like a tail -f
      });
      i += 1;
    }, 650);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-black/40 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent2/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        <span className="ml-3 font-mono text-[11px] text-muted">ai-mapper — {fileName}</span>
      </div>
      <div className="font-mono text-xs leading-relaxed text-good/90">
        {visibleLines.map((line, idx) => (
          <div key={idx}>
            <span className="text-accent">$</span> {line}
          </div>
        ))}
        <div>
          <span className="text-accent">$</span>
          <span className="cursor-blink">▍</span>
        </div>
      </div>
    </div>
  );
}
