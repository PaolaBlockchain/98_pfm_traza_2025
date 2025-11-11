'use client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 font-semibold">Wallet</th>
              <th className="px-3 py-2 font-semibold">Rol</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-600">
                  Sin solicitudes pendientes.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-mono">{row.address}</td>
                <td className="px-3 py-2 capitalize">{row.role.toLowerCase()}</td>
                <td className="px-3 py-2 capitalize">{row.status}</td>
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
    </Card>
  );
}
