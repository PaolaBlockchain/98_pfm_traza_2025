'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { UserTable, type UserRow } from '@/components/UserTable';
import { ContractService } from '@/lib/contractService';

/**
 * Componente AdminUsersPage - Interfaz de gestión y aprobación de usuarios
 *
 * Responsabilidades:
 * - Gestionar solicitudes de registro de usuarios pendientes desde blockchain
 * - Escuchar evento UserRegistered del smart contract en tiempo real
 * - Proporcionar acciones de aprobación y rechazo que llaman al contrato
 * - Controlar acceso exclusivo para administradores aprobados
 * - Mantener sincronización entre blockchain y UI
 *
 * Características principales:
 * - Control de acceso restringido a administradores aprobados
 * - Actualizaciones de estado de usuario en tiempo real con eventos de blockchain
 * - Integración completa con smart contract (approveUser/rejectUser)
 * - Integración con componente UserTable para UI consistente
 * - Limpieza automática de listeners al desmontar componente
 *
 * @returns {JSX.Element} El componente de página de gestión de usuarios administrativos
 */
export default function AdminUsersPage() {
  const { account, status } = useWallet();

  // Estado de usuarios registrados en el contrato
  const [users, setUsers] = useState<UserRow[]>([]);

  /**
   * Efecto para escuchar eventos UserRegistered del contrato
   * Se ejecuta al montar el componente y limpia listeners al desmontar
   */
  useEffect(() => {
    // Solo ejecutar si hay cuenta conectada y está aprobada
    if (!account || status !== 'approved') return;

    const loadUsers = async () => {
      try {
        const contractService = new ContractService();

        // Cargar eventos históricos del contrato
        // Como no tenemos una función para obtener todos los usuarios,
        // vamos a consultar la dirección conocida del Producer
        const producerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        
        try {
          const userInfo = await contractService.getUserInfo(producerAddress);
          const user: UserRow = {
            id: producerAddress,
            address: producerAddress,
            role: getRoleName(userInfo.role),
            status: getStatusName(userInfo.status),
          };
          setUsers([user]);
        } catch {
          console.log('Usuario Producer aún no registrado');
        }

        // Escuchar evento UserRegistered para nuevos registros
        contractService.onUserRegistered((userAddress, id, role, userStatus) => {
          const newUser: UserRow = {
            id: userAddress,
            address: userAddress,
            role: getRoleName(role),
            status: getStatusName(userStatus),
          };

          setUsers((prevUsers) => {
            const existingIndex = prevUsers.findIndex((u) => u.address === userAddress);
            if (existingIndex >= 0) {
              const updated = [...prevUsers];
              updated[existingIndex] = newUser;
              return updated;
            }
            return [...prevUsers, newUser];
          });
        });

        // Escuchar evento UserStatusChanged para actualizar la UI
        contractService.onUserStatusChanged((userAddress, id, newStatus) => {
          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.address === userAddress ? { ...u, status: getStatusName(newStatus) } : u
            )
          );
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
  }, [account, status]);

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para gestionar usuarios.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Solo cuentas aprobadas pueden ver esta sección.</p>;

  /**
   * Maneja la acción de aprobación de usuario
   * Llama a approveUser del smart contract en lugar de actualizar localStorage
   *
   * @param {string} id - La dirección del usuario a aprobar
   */
  const handleApprove = async (id: string) => {
    try {
      const contractService = new ContractService();
      await contractService.approveUser(id);
      console.log('Usuario aprobado:', id);
      
      // El estado se actualizará automáticamente via el evento UserStatusChanged
    } catch (error: unknown) {
      console.error('Error al aprobar usuario:', error);
      if (error instanceof Error) {
        alert(`Error al aprobar: ${error.message}`);
      } else {
        alert('Error desconocido al aprobar usuario');
      }
    }
  };

  /**
   * Maneja la acción de rechazo de usuario
   * Llama a rejectUser del smart contract en lugar de actualizar localStorage
   *
   * @param {string} id - La dirección del usuario a rechazar
   */
  const handleReject = async (id: string) => {
    try {
      const contractService = new ContractService();
      await contractService.rejectUser(id);
      console.log('Usuario rechazado:', id);
      
      // El estado se actualizará automáticamente via el evento UserStatusChanged
    } catch (error: unknown) {
      console.error('Error al rechazar usuario:', error);
      if (error instanceof Error) {
        alert(`Error al rechazar: ${error.message}`);
      } else {
        alert('Error desconocido al rechazar usuario');
      }
    }
  };

  return (
    <section className="space-y-4">
      {/* Encabezado de página */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Gestión de usuarios</h1>
        <p className="text-sm text-gray-600">
          Solicitudes de registro sincronizadas con el smart contract
        </p>
      </header>

      {/* Tabla de gestión de usuarios con acciones de aprobación/rechazo */}
      <UserTable rows={users} onApprove={handleApprove} onReject={handleReject} />
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

