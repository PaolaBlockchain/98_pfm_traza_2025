'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContractService } from '@/lib/contractService';
import TokenTraceabilityTree from '@/components/TokenTraceabilityTree';

/**
 * Estructura de datos del token desde el smart contract
 */
type TokenDetails = {
  id: number;
  creator: string;
  name: string;
  totalSupply: number;
  features: string;
  parentId: number;
  dateCreated: number;
  balance?: number;
  parentName?: string;
};

/**
 * Componente TokenDetailPage - Muestra detalles completos de un token
 *
 * Responsabilidades:
 * - Mostrar información completa de un token desde el smart contract
 * - Mostrar balance del usuario para el token
 * - Mostrar información del token padre si existe
 * - Proporcionar navegación de regreso a la lista de tokens
 * - Controlar acceso basado en conexión de wallet y estado de aprobación
 *
 * @returns {JSX.Element} El componente de página de detalles de token
 */
export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { account, status, role } = useWallet();
  
  const [token, setToken] = useState<TokenDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Detectar cambios de cuenta/rol y redirigir al dashboard
  const [previousAccount, setPreviousAccount] = useState<string | null>(account);
  useEffect(() => {
    // Si cambió la cuenta, redirigir al dashboard
    if (previousAccount && account && previousAccount !== account) {
      console.log('🔄 Cuenta cambiada en página de detalles de token, redirigiendo al dashboard...');
      if (status === 'approved' && role) {
        if (role === 'ADMIN') {
          router.push('/admin/users');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/');
      }
      return;
    }
    setPreviousAccount(account);
  }, [account, previousAccount, status, role, router]);

  // Obtener ID del token desde los parámetros de la URL
  const tokenId = params?.id ? parseInt(params.id as string, 10) : null;

  // Cargar detalles del token desde el smart contract
  useEffect(() => {
    async function loadTokenDetails() {
      if (!account || !tokenId || status !== 'approved') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const contractService = new ContractService();
        
        // Cargar información del token
        const tokenData = await contractService.getToken(tokenId);
        
        // Cargar balance del usuario desde el contrato
        // El contrato ya maneja el balance correctamente:
        // - Para creador: Suministro Total - Transferido
        // - Para otros: Recibido - Transferido
        // El balance se actualiza automáticamente en cada transacción
        const balance = await contractService.getTokenBalance(tokenId, account);
        console.log(`[TokenDetail] Balance del contrato para token ${tokenId}:`, balance);
        console.log(`[TokenDetail] Suministro Total:`, tokenData.totalSupply);
        console.log(`[TokenDetail] Creador:`, tokenData.creator);
        console.log(`[TokenDetail] Cuenta actual:`, account);
        console.log(`[TokenDetail] Es creador:`, tokenData.creator.toLowerCase() === account.toLowerCase());
        
        // Si es el creador, verificar que el balance sea correcto
        if (tokenData.creator.toLowerCase() === account.toLowerCase()) {
          const expectedBalance = tokenData.totalSupply; // Inicialmente debería ser igual al suministro total
          console.log(`[TokenDetail] Balance esperado (sin transferencias):`, expectedBalance);
          console.log(`[TokenDetail] Diferencia:`, expectedBalance - balance, 'unidades transferidas');
        }
        
        // Cargar información del token padre si existe
        let parentName: string | undefined;
        if (tokenData.parentId > 0) {
          try {
            const parentToken = await contractService.getToken(tokenData.parentId);
            parentName = parentToken.name;
          } catch (err) {
            console.error('Error al cargar token padre:', err);
            parentName = `Token #${tokenData.parentId}`;
          }
        }
        
        setToken({
          ...tokenData,
          balance,
          parentName,
        });
      } catch (err: any) {
        console.error('Error al cargar detalles del token:', err);
        setError(err.message || 'Error al cargar los detalles del token');
      } finally {
        setLoading(false);
      }
    }

    loadTokenDetails();
    
    // Escuchar eventos de transferencias para actualizar el balance automáticamente
    const contractService = new ContractService();
    const updateBalance = async () => {
      if (!account || !tokenId || status !== 'approved') return;
      try {
        const newBalance = await contractService.getTokenBalance(tokenId, account);
        setToken(prev => prev ? { ...prev, balance: newBalance } : null);
      } catch (err) {
        console.error('Error al actualizar balance:', err);
      }
    };

    // Suscribirse a eventos de transferencias
    try {
      contractService.onTransferAccepted(() => {
        updateBalance();
      });
      contractService.onTransferRejected(() => {
        updateBalance();
      });
    } catch (err) {
      console.error('Error al suscribirse a eventos:', err);
    }

    // Cleanup: remover listeners al desmontar
    return () => {
      // Los listeners se limpiarán automáticamente cuando el componente se desmonte
    };
  }, [account, tokenId, status]);

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para ver los detalles del token.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Tu registro debe ser aprobado para ver los detalles del token.</p>;

  // Validar tokenId
  if (!tokenId || isNaN(tokenId)) {
    return (
      <section className="space-y-4">
        <div className="rounded-md bg-red-50 border border-red-300 p-4 text-sm text-red-700">
          ❌ ID de token inválido
        </div>
        <Link href="/tokens">
          <Button>Volver a Mis tokens</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Encabezado con botón de regreso */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/tokens">
            <Button variant="secondary">← Volver</Button>
          </Link>
          <h1 className="text-2xl font-semibold">Detalles del token</h1>
        </div>
      </div>

      {/* Mensaje de carga */}
      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Cargando detalles del token...</p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Detalles del token */}
      {!loading && !error && token && (
        <div className="space-y-4">
          {/* Información principal del token */}
          <Card>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">{token.name}</h2>
                <p className="text-sm text-gray-500">Token #{token.id}</p>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-500 mb-1">ID del Token</dt>
                  <dd className="font-mono text-gray-900">{token.id}</dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500 mb-1">Creador</dt>
                  <dd className="font-mono text-gray-900 break-all">
                    {token.creator}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500 mb-1">Suministro Total</dt>
                  <dd className="text-gray-900 font-semibold">{token.totalSupply.toLocaleString()}</dd>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <dt className="font-medium text-gray-500">Tu Balance</dt>
                    <button
                      onClick={async () => {
                        if (!account || !tokenId) return;
                        try {
                          const contractService = new ContractService();
                          const newBalance = await contractService.getTokenBalance(tokenId, account);
                          console.log('[TokenDetail] Balance refrescado manualmente:', newBalance);
                          setToken(prev => prev ? { ...prev, balance: newBalance } : null);
                        } catch (err) {
                          console.error('Error al refrescar balance:', err);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      🔄 Refrescar
                    </button>
                  </div>
                  <dd className="text-gray-900 font-semibold text-lg">
                    {/* El balance del contrato ya refleja el estado correcto:
                        - Para creador: Suministro Total - Transferido
                        - Para otros: Recibido - Transferido
                        El contrato actualiza automáticamente el balance en cada transacción */}
                    {token.balance !== undefined ? token.balance.toLocaleString() : '0'}
                  </dd>
                  {token.creator.toLowerCase() === account?.toLowerCase() ? (
                    <dd className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                      <strong>Desglose (Eres el creador):</strong> {token.totalSupply.toLocaleString()} (Suministro Total) - {(token.totalSupply - (token.balance || 0)).toLocaleString()} (Transferido) = <strong>{token.balance?.toLocaleString() || '0'}</strong> (Tu Balance)
                    </dd>
                  ) : (
                    <dd className="text-xs text-gray-500 mt-1 bg-blue-50 p-2 rounded border border-blue-200">
                      <strong>Nota:</strong> Este es tu balance (lo que recibiste menos lo que transferiste). El balance del creador es diferente.
                    </dd>
                  )}
                </div>

                <div>
                  <dt className="font-medium text-gray-500 mb-1">Token Padre</dt>
                  <dd className="text-gray-900">
                    {token.parentId === 0 ? (
                      <span className="text-gray-400">Token raíz (sin padre)</span>
                    ) : (
                      <Link 
                        href={`/tokens/${token.parentId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {token.parentName || `Token #${token.parentId}`}
                      </Link>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500 mb-1">Fecha de Creación</dt>
                  <dd className="text-gray-900">
                    {new Date(token.dateCreated * 1000).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Metadatos del token - Reducido para dar espacio al diagrama */}
          <Card>
            <div className="p-4">
              <h3 className="text-md font-semibold mb-2">Metadatos</h3>
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                  {(() => {
                    try {
                      const parsed = JSON.parse(token.features);
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return token.features || 'Sin metadatos';
                    }
                  })()}
                </pre>
              </div>
            </div>
          </Card>

          {/* Árbol de Trazabilidad */}
          <div className="relative z-10 mb-0">
            <TokenTraceabilityTree tokenId={tokenId!} />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 mt-0">
            <Link href="/tokens">
              <Button variant="secondary">Volver a Mis tokens</Button>
            </Link>
            {token.balance && token.balance > 0 && role && role.toUpperCase() !== 'CONSUMER' && (
              <Link href={`/transfers?tokenId=${token.id}`}>
                <Button>Transferir tokens</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

