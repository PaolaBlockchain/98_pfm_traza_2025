'use client';
import React from 'react';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`border rounded p-2 w-full ${props.className || ''}`} />;
}
