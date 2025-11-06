'use client';
import React from 'react';

export function Label({ children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...rest} className={`block text-sm mb-1 ${rest.className || ''}`}>{children}</label>;
}
