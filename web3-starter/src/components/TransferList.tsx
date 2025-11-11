'use client';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export type TransferItem = {
  id: string;
  tokenId: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  amount: string;
  createdAt?: string;
  actions?: ReactNode;
};

export function TransferList({ title, items }: { title: string; items: TransferItem[] }) {
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Sin transferencias por ahora.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-3">
              <div className="flex flex-wrap gap-2">
                <span className="font-mono">#{item.id}</span>
                <span className="font-medium">Token {item.tokenId}</span>
                <span className="ml-auto capitalize">{item.status}</span>
              </div>
              <dl className="mt-2 grid gap-1 md:grid-cols-2">
                <div>
                  <dt className="text-gray-500">De</dt>
                  <dd className="font-mono">{item.from}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Para</dt>
                  <dd className="font-mono">{item.to}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Cantidad</dt>
                  <dd>{item.amount}</dd>
                </div>
                {item.createdAt && (
                  <div>
                    <dt className="text-gray-500">Fecha</dt>
                    <dd>{item.createdAt}</dd>
                  </div>
                )}
              </dl>
              {item.actions && <div className="mt-3 flex gap-2">{item.actions}</div>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
