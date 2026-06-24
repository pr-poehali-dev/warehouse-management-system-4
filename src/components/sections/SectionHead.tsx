import { ReactNode } from 'react';

export default function SectionHead({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}
