'use client';
import React from 'react';

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4 bg-white shadow-sm">
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      {children}
    </section>
  );
}
