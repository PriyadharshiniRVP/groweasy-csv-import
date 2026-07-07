'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  error?: string | null;
}

export default function Dropzone({ onFile, error }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) return;
      onFile(file);
    },
    [onFile]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-colors ${
          isDragging ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-neutral2'
        }`}
      >
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface2 text-2xl">
          ⇪
        </div>
        <p className="font-display text-lg font-medium text-ink">
          Drop a CSV file here, or click to browse
        </p>
        <p className="mt-2 max-w-sm font-mono text-xs text-muted">
          Facebook leads, Google Ads exports, real-estate CRM dumps, manual spreadsheets — any
          column layout works.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-4 py-2 font-mono text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
