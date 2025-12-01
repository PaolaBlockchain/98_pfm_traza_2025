'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/components/ui/toast';
import { TransferList, type TransferItem } from '@/components/TransferList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ContractService } from '@/lib/contractService';

/**
 * Componente TransfersPage - Interfaz de gestión de transferencias
 *
 * Responsabilidades:
 * - Mostrar transferencias pendientes que requieren aprobación
 * - Presentar historial completo de transferencias completadas
 * - Proporcionar interfaz unificada para gestión de transferencias
 * - Controlar acceso solo para usuarios con estado aprobado
 * - Cargar transferencias desde el smart contract
 *
 * Esta página muestra el panel de gestión de transferencias, mostrando tanto
 * transferencias pendientes que requieren aprobación como historial de
 * transferencias completadas. Proporciona una vista centralizada para
 * gestionar transferencias de tokens en el sistema de trazabilidad de
 * cadena de suministro.
 *
 * Características principales:
 * - Control de acceso solo para usuarios aprobados
 * - Vistas separadas para transferencias pendientes y completadas
 * - Integración con componente TransferList para UI consistente
 * - Carga dinámica de transferencias desde el smart contract
 * - Acciones para aceptar/rechazar transferencias pendientes
 *
 * @returns {JSX.Element} El componente de página de transferencias
 */
type ApprovedUser = {
  address: string;
  role: string;
};

export default function TransfersPage() {
  const { account, status, role } = useWallet();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [pendingTransfers, setPendingTransfers] = useState<TransferItem[]>([]);
  const [historyTransfers, setHistoryTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para crear transferencia
  const tokenIdParam = searchParams?.get('tokenId');
  const [showCreateForm, setShowCreateForm] = useState(!!tokenIdParam);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(
    tokenIdParam ? parseInt(tokenIdParam, 10) : null
  );
  const [tokenInfo, setTokenInfo] = useState<{ name: string; balance: number } | null>(null);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [processingTransfers, setProcessingTransfers] = useState<Set<number>>(new Set());
  
  // Detectar cambios de cuenta/rol y redirigir al dashboard
  const [previousAccount, setPreviousAccount] = useState<string | null>(account);
  useEffect(() => {
    // Si cambió la cuenta, redirigir al dashboard
    if (previousAccount && account && previousAccount !== account) {
      console.log('🔄 Cuenta cambiada en página de transferencias, redirigiendo al dashboard...');
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

  // Cargar transferencias del usuario desde el smart contract
  useEffect(() => {
    async function loadTransfers() {
      if (!account || status !== 'approved') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const contractService = new ContractService();
        
        // Obtener IDs de transferencias del usuario
        const transferIds = await contractService.getUserTransfers(account);
        
        // Cargar información completa de cada transferencia
        const allTransfers: TransferItem[] = [];
        for (const transferId of transferIds) {
          try {
            const transfer = await contractService.getTransfer(transferId);
            
            // Obtener información del token
            let tokenName = `Token #${transfer.tokenId}`;
            try {
              const token = await contractService.getToken(transfer.tokenId);
              tokenName = token.name;
            } catch (err) {
              console.error(`Error al cargar token ${transfer.tokenId}:`, err);
            }
            
            const statusMap: Record<number, 'pending' | 'accepted' | 'rejected'> = {
              0: 'pending',
              1: 'accepted',
              2: 'rejected',
            };
            
            const transferStatus = statusMap[transfer.status] || 'pending';
            
            // Determinar si el usuario es el receptor (puede aceptar/rechazar)
            const isRecipient = transfer.to.toLowerCase() === account.toLowerCase();
            
            const transferItem: TransferItem = {
              id: transfer.id.toString(),
              tokenId: `${transfer.tokenId} (${tokenName})`,
              from: transfer.from,
              to: transfer.to,
              status: transferStatus,
              amount: transfer.amount.toString(),
              createdAt: new Date(transfer.dateCreated * 1000).toLocaleString('es-ES'),
              actions: transferStatus === 'pending' && isRecipient ? (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleAcceptTransfer(transfer.id)}
                    disabled={processingTransfers.has(transfer.id)}
                  >
                    {processingTransfers.has(transfer.id) ? 'Procesando...' : 'Aceptar'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRejectTransfer(transfer.id)}
                    disabled={processingTransfers.has(transfer.id)}
                  >
                    {processingTransfers.has(transfer.id) ? 'Procesando...' : 'Rechazar'}
                  </Button>
                </div>
              ) : undefined,
            };
            
            allTransfers.push(transferItem);
          } catch (err) {
            console.error(`Error al cargar transferencia ${transferId}:`, err);
          }
        }
        
        // Separar pendientes del historial y ordenar ambas por fecha descendente
        const pending = allTransfers
          .filter(t => t.status === 'pending')
          .sort((a, b) => {
            // Ordenar por fecha descendente (más recientes primero)
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        const history = allTransfers
          .filter(t => t.status !== 'pending')
          .sort((a, b) => {
            // Ordenar por fecha descendente (más recientes primero)
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        
        setPendingTransfers(pending);
        setHistoryTransfers(history);
        
        // Escuchar nuevos eventos de transferencia
        try {
          contractService.onTransferRequested((transferId, from, to, tokenId, amount) => {
            console.log('Nueva transferencia solicitada:', transferId);
            loadTransfers(); // Recargar todas las transferencias
          });
        } catch (error) {
          console.warn('No se pudo configurar listener de TransferRequested:', error);
        }
        
        try {
          contractService.onTransferAccepted((transferId) => {
            console.log('Transferencia aceptada:', transferId);
            loadTransfers();
          });
        } catch (error) {
          console.warn('No se pudo configurar listener de TransferAccepted:', error);
        }
        
        try {
          contractService.onTransferRejected((transferId) => {
            console.log('Transferencia rechazada:', transferId);
            loadTransfers();
          });
        } catch (error) {
          console.warn('No se pudo configurar listener de TransferRejected:', error);
        }
        
        // Limpiar listeners al desmontar
        return () => {
          contractService.removeAllListeners();
        };
      } catch (err: any) {
        console.error('Error al cargar transferencias:', err);
        setError(err.message || 'Error al cargar las transferencias');
      } finally {
        setLoading(false);
      }
    }

    loadTransfers();
  }, [account, status]);

  // Cargar información del token y usuarios aprobados cuando hay tokenId
  useEffect(() => {
    async function loadTokenAndUsers() {
      if (!account || status !== 'approved' || !selectedTokenId) return;

      try {
        const contractService = new ContractService();
        
        // Cargar información del token
        const token = await contractService.getToken(selectedTokenId);
        const balance = await contractService.getTokenBalance(selectedTokenId, account);
        
        setTokenInfo({
          name: token.name,
          balance: balance,
        });

        // Cargar usuarios aprobados (excluyendo admin y el usuario actual)
        // Filtrar según el rol del usuario actual según las reglas de transferencia:
        // Producer → solo Factory
        // Factory → solo Retailer
        // Retailer → solo Consumer
        const pastEvents = await contractService.getPastUserRegisteredEvents();
        const userAddresses = new Set(pastEvents.map(event => event.user));
        
        // Determinar qué rol puede recibir transferencias del usuario actual
        let allowedRecipientRole: number | null = null;
        if (role === 'PRODUCER') {
          allowedRecipientRole = 2; // Factory
        } else if (role === 'FACTORY') {
          allowedRecipientRole = 3; // Retailer
        } else if (role === 'RETAILER') {
          allowedRecipientRole = 4; // Consumer
        }
        
        const users: ApprovedUser[] = [];
        for (const address of userAddresses) {
          if (address.toLowerCase() === account.toLowerCase()) continue;
          
          try {
            const userInfo = await contractService.getUserInfo(address);
            // Solo incluir usuarios aprobados, no admin, y que tengan el rol permitido
            if (userInfo.status === 1 && userInfo.role !== 0) {
              // Si hay un rol permitido definido, solo incluir usuarios con ese rol
              if (allowedRecipientRole !== null && userInfo.role !== allowedRecipientRole) {
                continue;
              }
              
              const roleNames: Record<number, string> = {
                1: 'Producer',
                2: 'Factory',
                3: 'Retailer',
                4: 'Consumer',
              };
              
              users.push({
                address: address,
                role: roleNames[userInfo.role] || 'Unknown',
              });
            }
          } catch (err) {
            console.error(`Error al cargar usuario ${address}:`, err);
          }
        }
        
        setApprovedUsers(users);
      } catch (err) {
        console.error('Error al cargar token o usuarios:', err);
      }
    }

    loadTokenAndUsers();
  }, [account, status, selectedTokenId]);

  // Manejar aceptación de transferencia
  const handleAcceptTransfer = async (transferId: number) => {
    // Prevenir doble clic
    if (processingTransfers.has(transferId)) {
      console.log('Transferencia ya está siendo procesada:', transferId);
      return;
    }

    try {
      // Verificar estado actual de la transferencia antes de procesar
      const contractService = new ContractService();
      const currentTransfer = await contractService.getTransfer(transferId);
      
      // Si ya no está pendiente, mostrar mensaje y recargar
      if (currentTransfer.status !== 0) {
        const statusText = currentTransfer.status === 1 ? 'aceptada' : 'rechazada';
        showToast(`Esta transferencia ya fue ${statusText} por otra transacción.`, 'info');
        // Forzar recarga
        window.location.reload();
        return;
      }

      // Agregar a procesamiento
      setProcessingTransfers(prev => new Set(prev).add(transferId));
      
      await contractService.acceptTransfer(transferId);
      showToast('Transferencia aceptada exitosamente', 'success');
      // La recarga se hará automáticamente via evento
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      const errorData = error?.data || error?.error?.data;
      
      // Remover de procesamiento en caso de error
      setProcessingTransfers(prev => {
        const newSet = new Set(prev);
        newSet.delete(transferId);
        return newSet;
      });
      
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected')
      ) {
        showToast('El usuario ha cancelado la solicitud desde MetaMask', 'warning');
        return;
      }
      
      // Detectar errores específicos del contrato
      if (
        error?.code === 'TRANSFER_ALREADY_PROCESSED' ||
        errorMessage.includes('transferalreadyprocessed') || 
        errorMessage.includes('transfer already processed') ||
        errorMessage.includes('ya fue procesada') ||
        errorMessage.includes('0x247ff345') ||
        (errorData && typeof errorData === 'string' && errorData.includes('0x247ff345'))
      ) {
        showToast('Esta transferencia ya fue procesada por otra transacción. La lista se actualizará automáticamente.', 'info');
        // Forzar recarga después de un breve delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      if (errorMessage.includes('nottransferrecipient') || 
          errorMessage.includes('not transfer recipient')) {
        showToast('No eres el destinatario de esta transferencia', 'error');
        return;
      }
      
      if (errorMessage.includes('insufficientbalance') || 
          errorMessage.includes('insufficient balance')) {
        showToast('El remitente no tiene suficiente balance para esta transferencia', 'error');
        return;
      }
      
      console.error('Error al aceptar transferencia:', error);
      showToast(error?.message || 'Error al aceptar la transferencia. Por favor, verifica que la transferencia siga pendiente.', 'error');
    }
  };

  // Manejar rechazo de transferencia
  const handleRejectTransfer = async (transferId: number) => {
    // Prevenir doble clic
    if (processingTransfers.has(transferId)) {
      console.log('Transferencia ya está siendo procesada:', transferId);
      return;
    }

    try {
      // Verificar estado actual de la transferencia antes de procesar
      const contractService = new ContractService();
      const currentTransfer = await contractService.getTransfer(transferId);
      
      // Si ya no está pendiente, mostrar mensaje y recargar
      if (currentTransfer.status !== 0) {
        const statusText = currentTransfer.status === 1 ? 'aceptada' : 'rechazada';
        showToast(`Esta transferencia ya fue ${statusText} por otra transacción.`, 'info');
        // Forzar recarga
        window.location.reload();
        return;
      }

      // Agregar a procesamiento
      setProcessingTransfers(prev => new Set(prev).add(transferId));
      
      await contractService.rejectTransfer(transferId);
      showToast('Transferencia rechazada', 'info');
      // La recarga se hará automáticamente via evento
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      const errorData = error?.data || error?.error?.data;
      
      // Remover de procesamiento en caso de error
      setProcessingTransfers(prev => {
        const newSet = new Set(prev);
        newSet.delete(transferId);
        return newSet;
      });
      
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected')
      ) {
        showToast('El usuario ha cancelado la solicitud desde MetaMask', 'warning');
        return;
      }
      
      // Detectar errores específicos del contrato
      if (
        error?.code === 'TRANSFER_ALREADY_PROCESSED' ||
        errorMessage.includes('transferalreadyprocessed') || 
        errorMessage.includes('transfer already processed') ||
        errorMessage.includes('ya fue procesada') ||
        errorMessage.includes('0x247ff345') ||
        (errorData && typeof errorData === 'string' && errorData.includes('0x247ff345'))
      ) {
        showToast('Esta transferencia ya fue procesada por otra transacción. La lista se actualizará automáticamente.', 'info');
        // Forzar recarga después de un breve delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      if (errorMessage.includes('nottransferrecipient') || 
          errorMessage.includes('not transfer recipient')) {
        showToast('No eres el destinatario de esta transferencia', 'error');
        return;
      }
      
      console.error('Error al rechazar transferencia:', error);
      showToast(error?.message || 'Error al rechazar la transferencia. Por favor, verifica que la transferencia siga pendiente.', 'error');
    }
  };

  // Manejar creación de transferencia
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTokenId || !selectedRecipient || !transferAmount) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    const amount = parseInt(transferAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('La cantidad debe ser un número mayor a 0', 'error');
      return;
    }

    if (tokenInfo && amount > tokenInfo.balance) {
      showToast(`No tienes suficiente balance. Disponible: ${tokenInfo.balance}`, 'error');
      return;
    }

    try {
      setIsCreatingTransfer(true);
      const contractService = new ContractService();
      await contractService.transfer(selectedRecipient, selectedTokenId, amount);
      
      showToast('Transferencia solicitada exitosamente', 'success');
      
      // Limpiar formulario y ocultar
      setSelectedRecipient('');
      setTransferAmount('');
      setShowCreateForm(false);
      
      // Remover tokenId de la URL
      router.push('/transfers');
      
      // La recarga se hará automáticamente via evento
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected')
      ) {
        showToast('El usuario ha cancelado la solicitud desde MetaMask', 'warning');
        return;
      }
      
      console.error('Error al crear transferencia:', error);
      showToast(error?.message || 'Error al crear la transferencia', 'error');
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para gestionar transferencias.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Necesitas aprobación para operar transferencias.</p>;

  // Verificar si el usuario es Admin
  const isAdmin = role && role.toUpperCase() === 'ADMIN';

  return (
    <section className="space-y-4">
      {/* Encabezado de página */}
      <header>
        <h1 className="text-2xl font-semibold">Transferencias</h1>
        <p className="text-sm text-gray-600">
          Gestiona transferencias de tokens en la cadena de suministro
        </p>
        {isAdmin && (
          <div className="mt-4 rounded-md bg-yellow-50 border border-yellow-300 p-4 text-sm text-yellow-700">
            ⚠️ Los administradores no pueden crear ni gestionar transferencias. Solo pueden ver el historial.
          </div>
        )}
      </header>

      {/* Mensaje de carga */}
      {loading && (
        <p className="text-sm text-gray-600">Cargando transferencias...</p>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Formulario para crear transferencia (oculto para Admin) */}
      {!isAdmin && showCreateForm && selectedTokenId && tokenInfo && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Crear Transferencia</h2>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  router.push('/transfers');
                }}
              >
                Cancelar
              </Button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Token: <span className="font-semibold">{tokenInfo.name}</span></p>
              <p className="text-sm text-gray-600">Balance disponible: <span className="font-semibold">{tokenInfo.balance}</span></p>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <Label htmlFor="recipient">Destinatario</Label>
                <Select
                  id="recipient"
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  required
                  disabled={approvedUsers.length === 0}
                >
                  <option value="">— Selecciona un usuario —</option>
                  {approvedUsers.map((user) => (
                    <option key={user.address} value={user.address}>
                      {user.address.slice(0, 6)}...{user.address.slice(-4)} ({user.role})
                    </option>
                  ))}
                </Select>
                {approvedUsers.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No hay usuarios disponibles con el rol permitido para tu rol ({role}).
                    {role === 'PRODUCER' && ' Necesitas usuarios con rol Factory aprobados.'}
                    {role === 'FACTORY' && ' Necesitas usuarios con rol Retailer aprobados.'}
                    {role === 'RETAILER' && ' Necesitas usuarios con rol Consumer aprobados.'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="amount">Cantidad</Label>
                <input
                  id="amount"
                  type="number"
                  min={1}
                  max={tokenInfo.balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder={`Máximo: ${tokenInfo.balance}`}
                  className="w-full rounded border p-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Balance disponible: {tokenInfo.balance}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isCreatingTransfer || !selectedRecipient || !transferAmount}
                >
                  {isCreatingTransfer ? 'Creando...' : 'Emitir Transferencia'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    router.push('/transfers');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Sección de transferencias pendientes */}
      <TransferList title="Pendientes" items={pendingTransfers} />

      {/* Sección de historial de transferencias */}
      <TransferList title="Historial" items={historyTransfers} />
    </section>
  );
}
