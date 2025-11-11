'use client';
import type { LabelHTMLAttributes } from 'react';

export function Label({ children, className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={`mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.35em] text-gray-400 ${className}`}
    >
      {children}
    </label>
  );
}
