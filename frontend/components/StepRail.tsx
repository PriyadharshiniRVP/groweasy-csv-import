import type { Step } from '@/lib/types';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'preview', label: 'Preview' },
  { key: 'processing', label: 'AI Mapping' },
  { key: 'results', label: 'Results' },
];

export default function StepRail({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0 font-mono text-xs uppercase tracking-wider">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                  isActive
                    ? 'border-accent bg-accent text-canvas'
                    : isDone
                    ? 'border-good text-good'
                    : 'border-border text-muted'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <span className={isActive ? 'text-ink' : isDone ? 'text-good' : 'text-muted'}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`mx-3 h-px w-8 ${i < currentIndex ? 'bg-good' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
