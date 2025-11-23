'use client';
import { Button } from '@/components/ui/button';
import React from 'react';

export type UserRow = {
  id: string;
  address: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
};

export type UserTableProps = {
  title?: string;
  rows: UserRow[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
};

export function UserTable({ title = 'Usuarios', rows, onApprove, onReject }: UserTableProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-900">Wallet</th>
              <th className="px-3 py-2 font-semibold text-gray-900">Rol</th>
              <th className="px-3 py-2 font-semibold text-gray-900">Estado</th>
              <th className="px-3 py-2 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                  Sin solicitudes pendientes.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-700">{row.address.slice(0, 6)}...{row.address.slice(-4)}</td>
                <td className="px-3 py-2 text-gray-700 capitalize">{row.role.toLowerCase()}</td>
                <td className="px-3 py-2 capitalize">
                  <span className={
                    row.status === 'pending' ? 'text-yellow-600' :
                    row.status === 'approved' ? 'text-green-600' :
                    row.status === 'rejected' ? 'text-red-600' :
                    'text-gray-600'
                  }>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {row.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={() => onApprove?.(row.id)}
                        aria-label={`Aprobar ${row.address}`}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => onReject?.(row.id)}
                        aria-label={`Rechazar ${row.address}`}
                      >
                        Rechazar
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
