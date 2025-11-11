/**
 * DashboardPage - Panel principal para usuarios aprobados
 *
 * Responsabilidades:
 * - Mostrar información del usuario conectado (cuenta, rol, estado, red)
 * - Proporcionar navegación a módulos principales (tokens, transferencias, admin)
 * - Controlar acceso basado en estado de aprobación del usuario
 * - Renderizar interfaz solo para usuarios con status 'approved'
 */

"use client";
import { useWallet } from '@/hooks/useWallet';
import Link from 'next/link';

/**
 * Componente principal del dashboard
 * Solo accesible para usuarios con estado 'approved'
 */
export default function DashboardPage() {
  // Obtener estado global de la wallet
  const { account, role, status } = useWallet();

  // Bloquear acceso si no hay wallet conectada
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[20vh]">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso bloqueado</h1>
        <p className="mb-2">Conecta tu wallet para acceder al dashboard.</p>
      </div>
    );
  }

  // Mostrar mensaje de acceso limitado para usuarios no aprobados
  if (status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold text-orange-600 mb-4">Acceso limitado</h1>
        <p className="mb-2 text-gray-600">Tu cuenta aún no tiene permisos para este panel. Espera la aprobación del administrador o revisa el estado en tu perfil.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Sección de información del nodo/usuario */}
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 px-6 py-5 shadow-sm backdrop-blur-sm">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-gray-400 mb-4">Vista General del Nodo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información de la cuenta conectada */}
            <div className="space-y-1">
              <p className="font-mono uppercase tracking-[0.28em] text-[0.6rem] text-gray-400">Cuenta</p>
              <p className="font-mono text-sm tracking-widest text-gray-600">{account}</p>
            </div>

            {/* Rol asignado al usuario */}
            <div className="space-y-1">
              <p className="font-mono uppercase tracking-[0.28em] text-[0.6rem] text-gray-400">Rol</p>
              <p className="font-mono text-sm tracking-[0.25em] text-gray-600">{role || 'Sin definir'}</p>
            </div>

            {/* Estado de aprobación del usuario */}
            <div className="space-y-1">
              <p className="font-mono uppercase tracking-[0.28em] text-[0.6rem] text-gray-400">Estado</p>
              <p className="font-mono text-sm tracking-[0.25em] text-gray-600">{status}</p>
            </div>

            {/* Información de la red blockchain */}
            <div className="space-y-1">
              <p className="font-mono uppercase tracking-[0.28em] text-[0.6rem] text-gray-400">Red</p>
              <p className="font-mono text-sm tracking-[0.25em] text-gray-600">Anvil Local - 31337</p>
            </div>
          </div>
        </div>

        {/* Sección de navegación a módulos principales */}
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 px-6 py-5 shadow-sm backdrop-blur-sm">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-gray-400 mb-4">Resumen de Misión</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Enlace al módulo de tokens */}
            <Link href="/tokens" className="group flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white px-5 py-6 shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md">
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-gray-600">Tokens</p>
              <p className="text-xs leading-relaxed text-gray-600">Gestiona el inventario de tokens</p>
            </Link>

            {/* Enlace al módulo de transferencias */}
            <Link href="/transfers" className="group flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white px-5 py-6 shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md">
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-gray-600">Transferencias</p>
              <p className="text-xs leading-relaxed text-gray-600">Ver y gestionar transferencias</p>
            </Link>

            {/* Enlace al panel de administración (solo para admins) */}
            {role?.toLowerCase() === 'admin' && (
              <Link href="/admin/users" className="group flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white px-5 py-6 shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md">
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-gray-600">Administración de Usuarios</p>
                <p className="text-xs leading-relaxed text-gray-600">Panel de administración</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
