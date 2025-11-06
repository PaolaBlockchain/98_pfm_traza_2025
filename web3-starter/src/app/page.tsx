'use client';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function HomePage() {
  const { account, status, role, connect, disconnect, setRole, setStatus, connecting, error } = useWallet();

  const uiState =
    !account ? 'not-connected'
    : status === 'unregistered' ? 'connected-unregistered'
    : status === 'pending' ? 'connected-pending'
    : 'connected-approved';

  return (
    <div className="space-y-4">
      <Card title="Estado de sesión">
        <p className="text-sm">Cuenta: {account ? `${account.slice(0,6)}…${account.slice(-4)}` : '—'}</p>
        <p className="text-sm">Registro: {status}</p>
        <div className="flex gap-2 mt-3">
          {!account ? (
            <Button onClick={connect} disabled={connecting}>{connecting ? 'Conectando…' : 'Conectar MetaMask'}</Button>
          ) : (
            <Button variant="secondary" onClick={disconnect}>Desconectar</Button>
          )}
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </Card>

      {uiState === 'not-connected' && (
        <Card title="No conectado">
          <p className="text-sm">Haz clic en “Conectar MetaMask”. Verifica la red <b>Anvil Local (31337)</b>.</p>
        </Card>
      )}

      {uiState === 'connected-unregistered' && (
        <Card title="Registro de rol">
          <div className="space-y-3">
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">— Selecciona —</option>
                <option value="CONSUMER">Consumer</option>
                <option value="DATA_PROVIDER">Data Provider</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <Button onClick={() => setStatus('pending')} disabled={!role}>Enviar registro</Button>
          </div>
        </Card>
      )}

      {uiState === 'connected-pending' && (
        <Card title="Pendiente de aprobación">
          <p className="text-sm">Tu registro está pendiente. (Demo) Haz clic para simular aprobación.</p>
          <Button onClick={() => setStatus('approved')}>Simular aprobación</Button>
        </Card>
      )}

      {uiState === 'connected-approved' && (
        <Card title="Bienvenida">
          <p>Ahora puedes ir al <a className="underline" href="/dashboard">dashboard</a>.</p>
        </Card>
      )}
    </div>
  );
}
