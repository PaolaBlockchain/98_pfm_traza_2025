'use client';
import type { TextareaHTMLAttributes } from 'react';

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-gray-300 bg-white px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-gray-500 placeholder:text-gray-300 transition-all duration-300 hover:border-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 ${className}`}
    />
  );
}
