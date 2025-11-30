'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/components/ui/toast';
import { UserTable, type UserRow } from '@/components/UserTable';
import { ContractService } from '@/lib/contractService';
import { RequestHistoryService } from '@/lib/requestHistoryService';

/**
 * Componente AdminUsersPage - Interfaz de gestión y aprobación de usuarios
 *
 * Responsabilidades:
 * - Gestionar solicitudes de registro de usuarios pendientes desde blockchain
 * - Escuchar evento UserRegistered del smart contract en tiempo real
 * - Proporcionar acciones de aprobación y rechazo que llaman al contrato
 * - Controlar acceso exclusivo para administradores aprobados
 * - Mantener sincronización entre blockchain y UI
 * - Mostrar historial de solicitudes y rechazos repetidos
 *
 * Características principales:
 * - Control de acceso restringido a administradores aprobados
 * - Actualizaciones de estado de usuario en tiempo real con eventos de blockchain
 * - Integración completa con smart contract (approveUser/rejectUser)
 * - Integración con componente UserTable para UI consistente
 * - Limpieza automática de listeners al desmontar componente
 * - Alertas sobre usuarios con múltiples rechazos
 *
 * @returns {JSX.Element} El componente de página de gestión de usuarios administrativos
 */
export default function AdminUsersPage() {
  const { account, status, role } = useWallet();
  const { showToast } = useToast();

  // Estado de usuarios registrados en el contrato
  const [users, setUsers] = useState<UserRow[]>([]);
  
  // Estado para paginación del historial
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estado para rastrear usuarios que están siendo procesados (para evitar múltiples transacciones)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  /**
   * Efecto para escuchar eventos UserRegistered del contrato
   * Se ejecuta al montar el componente y limpia listeners al desmontar
   */
  useEffect(() => {
    // Solo ejecutar si hay cuenta conectada, está aprobada y es ADMIN
    if (!account || status !== 'approved' || !role || role.toUpperCase() !== 'ADMIN') return;

    const loadUsers = async () => {
      try {
        const contractService = new ContractService();

        // Obtener eventos pasados del contrato (NO depender de localStorage)
        console.log('📜 Cargando eventos pasados del contrato...');
        const pastEvents = await contractService.getPastUserRegisteredEvents();
        console.log(`📦 Eventos encontrados: ${pastEvents.length}`);
        
        // Obtener wallets únicas
        const userAddresses = new Set(pastEvents.map(event => event.user));
        
        // Consultar el estado ACTUAL de cada usuario en el contrato
        const loadedUsers: UserRow[] = [];
        for (const address of userAddresses) {
          try {
            const userInfo = await contractService.getUserInfo(address);
            // Filtrar el admin: no mostrar usuarios con rol ADMIN (0)
            if (userInfo.role !== 0) {
              loadedUsers.push({
                id: address,
                address: address,
                role: getRoleName(userInfo.role),
                status: getStatusName(userInfo.status),
              });
            }
          } catch (error) {
            console.log(`Usuario ${address} no encontrado en contrato`);
          }
        }
        
        console.log(`✅ Admin cargó ${loadedUsers.length} usuarios desde el contrato`);
        setUsers(loadedUsers);

        // Escuchar evento UserRegistered para nuevos registros Y re-solicitudes
        contractService.onUserRegistered((userAddress, id, role, userStatus) => {
          console.log(`🔔 Admin recibió evento UserRegistered:`, userAddress, getRoleName(role), getStatusName(userStatus));
          
          // Filtrar el admin: no mostrar usuarios con rol ADMIN (0)
          if (role === 0) {
            console.log(`🚫 Ignorando evento de admin: ${userAddress}`);
            return;
          }
          
          const newUser: UserRow = {
            id: userAddress,
            address: userAddress,
            role: getRoleName(role),
            status: getStatusName(userStatus),
          };

          setUsers((prevUsers) => {
            const existingIndex = prevUsers.findIndex((u) => u.address === userAddress);
            if (existingIndex >= 0) {
              const previousStatus = prevUsers[existingIndex].status;
              console.log(`♻️ Actualizando usuario ${userAddress}: ${previousStatus} → ${getStatusName(userStatus)}`);
              
              const updated = [...prevUsers];
              updated[existingIndex] = newUser;
              
              return updated;
            }
            
            console.log(`➕ Agregando nuevo usuario: ${userAddress}`);
            
            return [...prevUsers, newUser];
          });
        });

        // Escuchar evento UserStatusChanged para actualizar la UI Y registrar en historial
        contractService.onUserStatusChanged((userAddress, id, newStatus) => {
          console.log(`🔔 Evento UserStatusChanged recibido:`, userAddress, getStatusName(newStatus));
          
          // Actualizar UI
          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.address === userAddress ? { ...u, status: getStatusName(newStatus) } : u
            )
          );
          
          // Registrar en historial para trazabilidad
          const statusName = getStatusName(newStatus);
          if (statusName === 'approved') {
            RequestHistoryService.addEntry({
              address: userAddress,
              action: 'approved',
              adminAddress: account,
            });
          } else if (statusName === 'rejected') {
            RequestHistoryService.addEntry({
              address: userAddress,
              action: 'rejected',
              adminAddress: account,
            });
          } else if (statusName === 'canceled') {
            RequestHistoryService.addEntry({
              address: userAddress,
              action: 'canceled',
            });
          }
        });

        // Limpiar listeners al desmontar
        return () => {
          contractService.removeAllListeners();
        };
      } catch (error) {
        console.error('Error al inicializar listeners de contrato:', error);
      }
    };

    loadUsers();
  }, [account, status, role]);

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para gestionar usuarios.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Solo cuentas aprobadas pueden ver esta sección.</p>;

  // Control de acceso: Requiere rol ADMIN
  if (!role || role.toUpperCase() !== 'ADMIN') {
    return (
      <section className="space-y-4">
        <div className="rounded-md bg-yellow-50 border border-yellow-300 p-6">
          <p className="text-sm text-yellow-800">
            Por favor presione el Dashboard si quieres ingresar al rol o Desconectar si quieres ingresar con otro rol.
          </p>
          <p className="text-sm text-yellow-800 mt-2">Tu rol actual: {role || 'sin definir'}</p>
        </div>
      </section>
    );
  }

  /**
   * Maneja la acción de aprobación de usuario
   * Llama a approveUser del smart contract en lugar de actualizar localStorage
   *
   * @param {string} id - La dirección del usuario a aprobar
   */
  const handleApprove = async (id: string) => {
    // Prevenir múltiples transacciones simultáneas para el mismo usuario
    if (processingUsers.has(id)) {
      showToast('Ya hay una transacción en proceso para este usuario. Por favor espera.', 'warning');
      return;
    }

    try {
      // Validar en el frontend antes de llamar al contrato
      const user = users.find(u => u.id === id);
      if (!user) {
        showToast('Usuario no encontrado', 'error');
        return;
      }

      if (user.status === 'approved') {
        showToast('Este usuario ya está aprobado', 'warning');
        return;
      }

      if (user.status !== 'pending') {
        showToast(`No se puede aprobar un usuario con estado: ${user.status}`, 'warning');
        return;
      }

      // Marcar como procesando
      setProcessingUsers(prev => new Set(prev).add(id));

      // Verificar el estado actual del usuario en el contrato antes de enviar la transacción
      const contractService = new ContractService();
      try {
        const currentUserInfo = await contractService.getUserInfo(id);
        if (currentUserInfo.status === 1) { // 1 = Approved
          showToast('Este usuario ya fue aprobado. La lista se actualizará automáticamente.', 'info');
          setProcessingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          // Recargar usuarios para actualizar el estado
          const pastEvents = await contractService.getPastUserRegisteredEvents();
          const userAddresses = new Set(pastEvents.map(event => event.user));
          const loadedUsers: UserRow[] = [];
          for (const address of userAddresses) {
            try {
              const userInfo = await contractService.getUserInfo(address);
              if (userInfo.role !== 0) {
                loadedUsers.push({
                  id: address,
                  address: address,
                  role: getRoleName(userInfo.role),
                  status: getStatusName(userInfo.status),
                });
              }
            } catch (err) {
              console.log(`Usuario ${address} no encontrado`);
            }
          }
          setUsers(loadedUsers);
          return;
        }
      } catch (err) {
        console.log('Error al verificar estado del usuario:', err);
      }

      await contractService.approveUser(id);
      console.log('Usuario aprobado:', id);
      
      // El historial se registrará automáticamente via evento UserStatusChanged
      // El re-render también se activará automáticamente
    } catch (error: unknown) {
      // Detectar si el usuario canceló la transacción en MetaMask
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const errorCode = (error as any)?.code;
        
        if (
          errorCode === 4001 ||
          errorCode === 'ACTION_REJECTED' ||
          errorMessage.includes('user denied') ||
          errorMessage.includes('user rejected') ||
          errorMessage.includes('rejected')
        ) {
          // El usuario canceló la transacción, mostrar toaster
          showToast('El usuario ha cancelado la solicitud desde MetaMask', 'warning');
          return;
        }

        // Detectar error de transacción revertida (usuario ya aprobado o estado inválido)
        if (
          errorMessage.includes('invalidtransition') ||
          errorMessage.includes('invalid transition') ||
          errorMessage.includes('transaction execution reverted') ||
          errorMessage.includes('call_exception') ||
          (error as any)?.code === 'CALL_EXCEPTION'
        ) {
          showToast('Este usuario ya fue aprobado por otra transacción. La lista se actualizará automáticamente.', 'info');
          // Recargar usuarios para actualizar el estado
          const contractService = new ContractService();
          const pastEvents = await contractService.getPastUserRegisteredEvents();
          const userAddresses = new Set(pastEvents.map(event => event.user));
          const loadedUsers: UserRow[] = [];
          for (const address of userAddresses) {
            try {
              const userInfo = await contractService.getUserInfo(address);
              if (userInfo.role !== 0) {
                loadedUsers.push({
                  id: address,
                  address: address,
                  role: getRoleName(userInfo.role),
                  status: getStatusName(userInfo.status),
                });
              }
            } catch (err) {
              console.log(`Usuario ${address} no encontrado`);
            }
          }
          setUsers(loadedUsers);
          return;
        }
        
        // Para otros errores, sí mostrar el mensaje
        console.error('Error al aprobar usuario:', error);
        showToast(`Error al aprobar: ${error.message}`, 'error');
      } else {
        console.error('Error desconocido al aprobar usuario:', error);
        showToast('Error desconocido al aprobar usuario', 'error');
      }
    } finally {
      // Siempre remover del conjunto de procesamiento
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  /**
   * Maneja la acción de rechazo de usuario
   * Llama a rejectUser del smart contract en lugar de actualizar localStorage
   *
   * @param {string} id - La dirección del usuario a rechazar
   */
  const handleReject = async (id: string) => {
    // Prevenir múltiples transacciones simultáneas para el mismo usuario
    if (processingUsers.has(id)) {
      showToast('Ya hay una transacción en proceso para este usuario. Por favor espera.', 'warning');
      return;
    }

    try {
      // Validar en el frontend antes de llamar al contrato
      const user = users.find(u => u.id === id);
      if (!user) {
        showToast('Usuario no encontrado', 'error');
        return;
      }

      if (user.status === 'rejected') {
        showToast('Este usuario ya está rechazado', 'warning');
        return;
      }

      if (user.status !== 'pending') {
        showToast(`No se puede rechazar un usuario con estado: ${user.status}`, 'warning');
        return;
      }

      // Marcar como procesando
      setProcessingUsers(prev => new Set(prev).add(id));

      // Verificar el estado actual del usuario en el contrato antes de enviar la transacción
      const contractService = new ContractService();
      try {
        const currentUserInfo = await contractService.getUserInfo(id);
        if (currentUserInfo.status === 2) { // 2 = Rejected
          showToast('Este usuario ya fue rechazado. La lista se actualizará automáticamente.', 'info');
          setProcessingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          // Recargar usuarios para actualizar el estado
          const pastEvents = await contractService.getPastUserRegisteredEvents();
          const userAddresses = new Set(pastEvents.map(event => event.user));
          const loadedUsers: UserRow[] = [];
          for (const address of userAddresses) {
            try {
              const userInfo = await contractService.getUserInfo(address);
              if (userInfo.role !== 0) {
                loadedUsers.push({
                  id: address,
                  address: address,
                  role: getRoleName(userInfo.role),
                  status: getStatusName(userInfo.status),
                });
              }
            } catch (err) {
              console.log(`Usuario ${address} no encontrado`);
            }
          }
          setUsers(loadedUsers);
          return;
        }
      } catch (err) {
        console.log('Error al verificar estado del usuario:', err);
      }

      await contractService.rejectUser(id);
      console.log('Usuario rechazado:', id);
      
      // El historial se registrará automáticamente via evento UserStatusChanged
      // El re-render también se activará automáticamente
    } catch (error: unknown) {
      // Detectar si el usuario canceló la transacción en MetaMask
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const errorCode = (error as any)?.code;
        
        if (
          errorCode === 4001 ||
          errorCode === 'ACTION_REJECTED' ||
          errorMessage.includes('user denied') ||
          errorMessage.includes('user rejected') ||
          errorMessage.includes('rejected')
        ) {
          // El usuario canceló la transacción, mostrar toaster
          showToast('El usuario ha cancelado la solicitud desde MetaMask', 'warning');
          return;
        }

        // Detectar error de transacción revertida (usuario ya rechazado o estado inválido)
        if (
          errorMessage.includes('invalidtransition') ||
          errorMessage.includes('invalid transition') ||
          errorMessage.includes('transaction execution reverted') ||
          errorMessage.includes('call_exception') ||
          (error as any)?.code === 'CALL_EXCEPTION'
        ) {
          showToast('Este usuario ya fue rechazado por otra transacción. La lista se actualizará automáticamente.', 'info');
          // Recargar usuarios para actualizar el estado
          const contractService = new ContractService();
          const pastEvents = await contractService.getPastUserRegisteredEvents();
          const userAddresses = new Set(pastEvents.map(event => event.user));
          const loadedUsers: UserRow[] = [];
          for (const address of userAddresses) {
            try {
              const userInfo = await contractService.getUserInfo(address);
              if (userInfo.role !== 0) {
                loadedUsers.push({
                  id: address,
                  address: address,
                  role: getRoleName(userInfo.role),
                  status: getStatusName(userInfo.status),
                });
              }
            } catch (err) {
              console.log(`Usuario ${address} no encontrado`);
            }
          }
          setUsers(loadedUsers);
          return;
        }
        
        // Para otros errores, sí mostrar el mensaje
        console.error('Error al rechazar usuario:', error);
        showToast(`Error al rechazar: ${error.message}`, 'error');
      } else {
        console.error('Error desconocido al rechazar usuario:', error);
        showToast('Error desconocido al rechazar usuario', 'error');
      }
    } finally {
      // Siempre remover del conjunto de procesamiento
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Calcular datos de paginación
  const allHistory = RequestHistoryService.getHistory().sort((a, b) => b.timestamp - a.timestamp);
  const totalPages = Math.ceil(allHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistory = allHistory.slice(startIndex, endIndex);

  return (
    <section className="space-y-4">
      {/* Encabezado de página */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Gestión de usuarios</h1>
        <p className="text-sm text-gray-600">
          Solicitudes de registro sincronizadas con el smart contract
        </p>
      </header>

      {/* Panel de eventos de trazabilidad */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Historial de Eventos (Trazabilidad)</h2>
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres limpiar todo el historial de eventos?')) {
                RequestHistoryService.clearHistory();
                window.location.reload();
              }
            }}
            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
          >
            🗑️ Limpiar Historial
          </button>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-900">Timestamp</th>
                <th className="px-3 py-2 font-semibold text-gray-900">Wallet</th>
                <th className="px-3 py-2 font-semibold text-gray-900">Acción</th>
                <th className="px-3 py-2 font-semibold text-gray-900">Rol</th>
                <th className="px-3 py-2 font-semibold text-gray-900">Admin</th>
              </tr>
            </thead>
            <tbody>
              {currentHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(entry.timestamp).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          entry.action === 'requested'
                            ? 'bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium'
                            : entry.action === 'approved'
                            ? 'bg-green-100 text-green-700 px-2 py-1 rounded font-medium'
                            : entry.action === 'rejected'
                            ? 'bg-red-100 text-red-700 px-2 py-1 rounded font-medium'
                            : 'bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium'
                        }
                      >
                        {entry.action === 'requested' && '📝 Solicitado'}
                        {entry.action === 'approved' && '✅ Aprobado'}
                        {entry.action === 'rejected' && '❌ Rechazado'}
                        {entry.action === 'canceled' && '🚫 Cancelado'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 capitalize">
                      {entry.roleId !== undefined ? 
                        (['Admin', 'Producer', 'Factory', 'Retailer', 'Consumer'][entry.roleId] || '-') 
                        : '-'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">
                      {entry.adminAddress ? 
                        `${entry.adminAddress.slice(0, 6)}...${entry.adminAddress.slice(-4)}` 
                        : '-'}
                    </td>
                  </tr>
                ))}
              {allHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No hay eventos registrados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1} - {Math.min(endIndex, allHistory.length)} de {allHistory.length} eventos
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de gestión de usuarios con acciones de aprobación/rechazo */}
      <UserTable 
        rows={users} 
        onApprove={handleApprove} 
        onReject={handleReject}
        processingUsers={processingUsers}
      />
    </section>
  );
}

/**
 * Convierte el número del rol del contrato a string
 * @param role - Número del enum Roles (0=Admin, 1=Producer, 2=Factory, 3=Retailer, 4=Consumer)
 * @returns Nombre del rol como string
 */
function getRoleName(role: number): string {
  const roleMap: Record<number, string> = {
    0: 'ADMIN',
    1: 'PRODUCER',
    2: 'FACTORY',
    3: 'RETAILER',
    4: 'CONSUMER',
  };
  return roleMap[role] || 'UNKNOWN';
}

/**
 * Convierte el número del estado del contrato a string
 * @param status - Número del enum UserStatus (0=Pending, 1=Approved, 2=Rejected, 3=Canceled)
 * @returns Nombre del estado como string
 */
function getStatusName(status: number): 'pending' | 'approved' | 'rejected' | 'canceled' {
  const statusMap: Record<number, 'pending' | 'approved' | 'rejected' | 'canceled'> = {
    0: 'pending',
    1: 'approved',
    2: 'rejected',
    3: 'canceled',
  };
  return statusMap[status] || 'pending';
}

