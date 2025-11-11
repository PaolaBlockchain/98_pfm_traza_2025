'use client';
import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  className?: string;
  contentClassName?: string;
}>;

export function Card({ title, subtitle, className = '', contentClassName = '', children }: CardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-gray-200/70 to-transparent" />
      {title && (
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-[0.32em] text-gray-600">{title}</h2>
            {subtitle && <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-gray-400">{subtitle}</p>}
          </div>
        </header>
      )}
      <div className={`space-y-3 text-sm text-gray-600 ${contentClassName}`}>{children}</div>
    </section>
  );
}
