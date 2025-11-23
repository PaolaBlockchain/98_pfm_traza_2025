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
import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Componente principal del dashboard
 * Solo accesible para usuarios con estado 'approved'
 */
export default function DashboardPage() {
  // Obtener estado global de la wallet
  const { account, role, status } = useWallet();
  const router = useRouter();
  
  // Estado local para verificar si aún está cargando
  const [isLoading, setIsLoading] = React.useState(true);

  // Redirigir usuarios no aprobados a la página principal
  React.useEffect(() => {
    // Si no está loading y el usuario no está aprobado, redirigir
    if (!isLoading && status !== 'approved') {
      console.log(`🔄 Usuario con estado "${status}" redirigido a página principal`);
      router.push('/');
    }
  }, [status, isLoading, router]);

  // Esperar un momento para que el estado se sincronice
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Aumentado a 1 segundo para dar tiempo a la consulta del contrato
    return () => clearTimeout(timer);
  }, []);

  // Mostrar loading mientras se sincroniza el estado
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[20vh]">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

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
    // Mensaje específico para usuarios rechazados
    if (status === 'rejected') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="max-w-md w-full bg-red-50 border-2 border-red-300 rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <h1 className="text-xl font-bold text-red-700">❌ Solicitud Rechazada</h1>
            </div>
            <p className="text-sm text-red-800 mb-4 font-semibold">
              Tu cuenta fue rechazada por el administrador.
            </p>
            <p className="text-sm text-red-700 mb-4">
              No tienes permisos para acceder a este panel. Debes realizar una nueva solicitud desde la página principal.
            </p>
            <Link 
              href="/" 
              className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              🔄 Ir a realizar nueva solicitud
            </Link>
          </div>
        </div>
      );
    }
    
    // Mensaje para otros estados (pending, canceled, etc.)
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
