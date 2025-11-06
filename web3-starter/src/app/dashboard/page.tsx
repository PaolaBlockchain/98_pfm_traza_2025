'use client';
import { useWallet } from '@/hooks/useWallet';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const { account, role, status } = useWallet();
  if (!account) return <p>Necesitas conectar MetaMask.</p>;
  if (status !== 'approved') return <p>Acceso restringido. Estado actual: {status}</p>;

  return (
    <div className="space-y-4">
      <Card title="Dashboard">
        <ul className="list-disc pl-6 text-sm">
          <li>Cuenta: {account}</li>
          <li>Rol: {role || '—'}</li>
          <li>Estado de registro: {status}</li>
        </ul>
      </Card>
    </div>
  );
}
