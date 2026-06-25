import { ReactNode } from 'react';

export default function SectionHead({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      {action && <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
    </div>
  );
}