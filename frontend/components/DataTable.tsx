interface Props {
  columns: string[];
  rows: Record<string, string>[];
  emptyLabel?: string;
  maxHeightClass?: string;
}

export default function DataTable({ columns, rows, emptyLabel = 'No rows', maxHeightClass = 'max-h-[420px]' }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface py-16 font-mono text-xs text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`thin-scroll overflow-auto rounded-xl border border-border ${maxHeightClass}`}>
      <table className="min-w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="sticky-th whitespace-nowrap border-b border-border bg-surface2 px-4 py-2.5 font-mono font-medium uppercase tracking-wide text-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-surface even:bg-surface/60 hover:bg-surface2">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap border-b border-border/60 px-4 py-2 text-ink/90">
                  {row[col] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
