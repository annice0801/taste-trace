// 後台共用的小元件
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-serif text-3xl tabular-nums ${tone === "warn" ? "text-red-700 dark:text-red-400" : ""}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

export function Card({ title, actions, children }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-serif text-xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// 橫條圖的一列
export function BarRow({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3 text-sm">
      <span className="truncate">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-background">
        <span className="block h-full rounded-full bg-olive" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="text-right text-xs text-muted tabular-nums">{value}{suffix}</span>
    </div>
  );
}

export function Loading() {
  return <p className="animate-pulse text-sm text-muted">載入中…</p>;
}

export function ErrorText({ message }: { message: string }) {
  return <p className="text-sm text-red-700 dark:text-red-400">{message}</p>;
}
