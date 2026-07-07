'use client';

import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import StepRail from '@/components/StepRail';
import Dropzone from '@/components/Dropzone';
import DataTable from '@/components/DataTable';
import ProcessingConsole from '@/components/ProcessingConsole';
import { importCsv, ApiError } from '@/lib/api';
import { CRM_FIELD_ORDER, type ImportResult, type ParsedPreview, type Step } from '@/lib/types';

const PREVIEW_ROW_LIMIT = 50;

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultsView, setResultsView] = useState<'imported' | 'skipped'>('imported');

  // Step 1 -> 2: parse client-side ONLY for preview. No AI, no backend call.
  const handleFile = useCallback((incoming: File) => {
    setError(null);
    setFile(incoming);

    Papa.parse<Record<string, string>>(incoming, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length && results.data.length === 0) {
          setError('Could not parse this CSV. Check that it has a header row and at least one data row.');
          return;
        }
        const headers = results.meta.fields || [];
        setPreview({
          headers,
          rows: results.data.slice(0, PREVIEW_ROW_LIMIT),
          totalRows: results.data.length,
        });
        setStep('preview');
      },
      error: () => setError('Could not read this file.'),
    });
  }, []);

  // Step 3: Confirm -> upload the raw file to the backend for AI mapping.
  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setStep('processing');
    setError(null);
    try {
      const res = await importCsv(file);
      setResult(res);
      setStep('results');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong during import.';
      setError(message);
      setStep('preview');
    }
  }, [file]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep('upload');
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">GrowEasy CRM</p>
            <h1 className="font-display text-3xl font-bold text-ink">AI CSV Importer</h1>
          </div>
          {file && (
            <button
              onClick={reset}
              className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-muted hover:border-neutral2 hover:text-ink"
            >
              start over
            </button>
          )}
        </div>
        <StepRail current={step} />
      </header>

      {step === 'upload' && <Dropzone onFile={handleFile} error={error} />}

      {step === 'preview' && preview && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
            <div>
              <p className="font-display text-base font-medium text-ink">{file?.name}</p>
              <p className="font-mono text-xs text-muted">
                {preview.totalRows.toLocaleString()} rows detected · showing first{' '}
                {Math.min(PREVIEW_ROW_LIMIT, preview.totalRows)} · {preview.headers.length} columns
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="rounded-lg border border-border px-4 py-2 font-mono text-xs text-muted hover:border-neutral2 hover:text-ink"
              >
                cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-accent px-5 py-2 font-mono text-xs font-medium text-white hover:bg-accent/90"
              >
                confirm &amp; run AI mapping →
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-bad/30 bg-bad/10 px-4 py-2 font-mono text-xs text-bad">
              {error}
            </p>
          )}

          <p className="font-mono text-[11px] text-muted">
            no AI processing has run yet — this is a raw preview of your file.
          </p>
          <DataTable columns={preview.headers} rows={preview.rows} />
        </section>
      )}

      {step === 'processing' && <ProcessingConsole fileName={file?.name || 'upload.csv'} />}

      {step === 'results' && result && (
        <section className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="source rows" value={result.totalSourceRows} />
            <StatCard label="imported" value={result.totalImported} tone="good" />
            <StatCard label="skipped" value={result.totalSkipped} tone={result.totalSkipped ? 'bad' : undefined} />
          </div>

          <div className="flex gap-2 font-mono text-xs">
            <TabButton active={resultsView === 'imported'} onClick={() => setResultsView('imported')}>
              Imported ({result.totalImported})
            </TabButton>
            <TabButton active={resultsView === 'skipped'} onClick={() => setResultsView('skipped')}>
              Skipped ({result.totalSkipped})
            </TabButton>
          </div>

          {resultsView === 'imported' ? (
            <DataTable
              columns={CRM_FIELD_ORDER}
              rows={result.imported}
              emptyLabel="No records were successfully mapped."
            />
          ) : (
            <DataTable
              columns={['reason', ...result.headers]}
              rows={result.skipped.map((s) => ({ reason: s.reason, ...s.source }))}
              emptyLabel="Nothing was skipped — every row had an email or mobile number."
            />
          )}
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-display text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 ${
        active ? 'border-accent bg-accent/10 text-ink' : 'border-border text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
