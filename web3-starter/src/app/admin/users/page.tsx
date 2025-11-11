'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { UserTable, type UserRow } from '@/components/UserTable';

/**
 * Recupera solicitudes de registro de usuarios pendientes desde localStorage
 * Esta función proporciona persistencia del lado del cliente para el flujo
 * de aprobación de usuarios hasta que se complete la integración con smart contract
 *
 * @returns {UserRow[]} Array de solicitudes de usuario pendientes o array vacío si no existen
 */
function getPendingRequests(): UserRow[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('pendingUserRequests');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Guarda solicitudes de registro de usuarios pendientes en localStorage
 * Mantiene la persistencia del estado a través de sesiones del navegador
 * para el flujo de aprobación
 *
 * @param {UserRow[]} requests - Array de solicitudes de usuario a persistir
 */
function savePendingRequests(requests: UserRow[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pendingUserRequests', JSON.stringify(requests));
}

/**
 * Componente AdminUsersPage - Interfaz de gestión y aprobación de usuarios
 *
 * Responsabilidades:
 * - Gestionar solicitudes de registro de usuarios pendientes
 * - Proporcionar acciones de aprobación y rechazo de solicitudes
 * - Mantener estado persistente de solicitudes en localStorage
 * - Controlar acceso exclusivo para administradores aprobados
 * - Preparar integración con función changeStatusUser del smart contract
 *
 * Esta página administrativa proporciona funcionalidad para gestionar solicitudes
 * de registro de usuarios. Los administradores pueden aprobar o rechazar
 * aplicaciones de usuario pendientes, con cambios persistidos en localStorage
 * hasta la integración con smart contract.
 *
 * Características principales:
 * - Control de acceso restringido a administradores aprobados
 * - Actualizaciones de estado de usuario en tiempo real (aprobar/rechazar)
 * - Persistencia localStorage para gestión de estado de solicitudes
 * - Integración con componente UserTable para UI consistente
 * - Lista de verificación para integración con smart contract
 *
 * @returns {JSX.Element} El componente de página de gestión de usuarios administrativos
 */
export default function AdminUsersPage() {
  const { account, status } = useWallet();

  // Inicializar estado de usuarios desde datos persistidos en localStorage
  const [users, setUsers] = useState<UserRow[]>(() => getPendingRequests());

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para gestionar usuarios.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Solo cuentas aprobadas pueden ver esta sección.</p>;

  /**
   * Maneja la acción de aprobación de usuario
   * Actualiza el estado del usuario a 'approved' y persiste cambios en localStorage
   *
   * @param {string} id - El identificador único del usuario a aprobar
   */
  const handleApprove = (id: string) => {
    const updatedUsers = users.map((user) => (user.id === id ? { ...user, status: 'approved' as const } : user));
    setUsers(updatedUsers);
    savePendingRequests(updatedUsers);
  };

  /**
   * Maneja la acción de rechazo de usuario
   * Actualiza el estado del usuario a 'rejected' y persiste cambios en localStorage
   *
   * @param {string} id - El identificador único del usuario a rechazar
   */
  const handleReject = (id: string) => {
    const updatedUsers = users.map((user) => (user.id === id ? { ...user, status: 'rejected' as const } : user));
    setUsers(updatedUsers);
    savePendingRequests(updatedUsers);
  };

  return (
    <section className="space-y-4">
      {/* Encabezado de página con título y nota de desarrollo */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Gestión de usuarios</h1>
        <p className="text-sm text-gray-600">
          TODO: Conectar con `changeStatusUser` del contrato y paginar resultados.
        </p>
      </header>

      {/* Tabla de gestión de usuarios con acciones de aprobación/rechazo */}
      <UserTable rows={users} onApprove={handleApprove} onReject={handleReject} />
    </section>
  );
}
