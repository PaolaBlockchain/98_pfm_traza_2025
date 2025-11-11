'use client';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export type TokenCardProps = {
  id: string;
  name: string;
  owner: string;
  role?: string;
  metadataSummary?: string;
  cta?: ReactNode;
};

export function TokenCard({ id, name, owner, role, metadataSummary, cta }: TokenCardProps) {
  return (
    <Card title={name}>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="font-medium text-gray-500">Token ID</dt>
          <dd className="font-mono">{id}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-medium text-gray-500">Propietario</dt>
          <dd className="font-mono">{owner}</dd>
        </div>
        {role && (
          <div className="flex justify-between">
            <dt className="font-medium text-gray-500">Rol</dt>
            <dd>{role}</dd>
          </div>
        )}
        {metadataSummary && (
          <div>
            <dt className="font-medium text-gray-500">Resumen</dt>
            <dd>{metadataSummary}</dd>
          </div>
        )}
      </dl>
      {cta && <div className="mt-4 flex gap-2">{cta}</div>}
    </Card>
  );
}
