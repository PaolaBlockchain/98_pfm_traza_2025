'use client';
import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'rounded-2xl px-4 py-2 border hover:shadow transition';
  const styles = variant === 'primary' ? 'bg-white' : 'bg-gray-100';
  return <button {...props} className={`${base} ${styles} ${className}`} />;
}
