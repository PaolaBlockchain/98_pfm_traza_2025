/**
 * HomePage - Página principal del sistema de trazabilidad
 *
 * Responsabilidades:
 * - Gestionar el flujo completo de registro de usuarios (conexión → selección de rol → solicitud)
 * - Controlar estados de solicitud (unregistered, pending, approved, rejected, canceled)
 * - Proporcionar interfaz para selección de roles (Producer, Factory, Retailer, Consumer, Admin)
 * - Manejar cancelación y reinicio de solicitudes
 * - Redirigir automáticamente a dashboard cuando usuario está aprobado
 * - Persistir solicitudes en localStorage para que admin las gestione
 */

"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Ban, Clock } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ContractService } from '@/lib/contractService';
import { RequestHistoryService } from '@/lib/requestHistoryService';

// Opciones disponibles de roles en el sistema
const ROLE_OPTIONS = [
  { value: '', label: '— Selecciona —' },
  { value: 'PRODUCER', label: 'Producer' },
  { value: 'FACTORY', label: 'Factory' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'CONSUMER', label: 'Consumer' },
  { value: 'ADMIN', label: 'Admin' },
];

// Mapeo de roles a IDs del contrato (según enum Roles en Solidity)
const ROLE_TO_ID: Record<string, number> = {
  PRODUCER: 1,
  FACTORY: 2,
  RETAILER: 3,
  CONSUMER: 4,
};

/**
 * Componente principal de la página de inicio
 * Maneja todo el flujo de registro y autenticación de usuarios
 */
export default function HomePage() {
  // Estado global de la wallet y funciones de control
  const { account, status, role, setRole, setStatus, connect } = useWallet();
  const router = useRouter();

  // Determinar el estado de la interfaz de usuario basado en conexión y estado de registro
  const uiState = !account
    ? 'not-connected'
    : status === 'unregistered'
    ? 'connected-unregistered'
    : status === 'pending'
    ? 'connected-pending'
    : status === 'approved'
    ? 'connected-approved'
    : status === 'rejected'
    ? 'connected-rejected'
    : 'connected-canceled';

  // Redirección automática al dashboard si está aprobado o es admin
  React.useEffect(() => {
    console.log('🔄 Verificando redirección:', { status, account, role });
    
    if (status === 'approved' && account && role) {
      console.log('✅ Usuario aprobado, redirigiendo...');
      
      // Redirigir a admin dashboard si es admin, sino a dashboard normal
      if (role === 'ADMIN') {
        console.log('👑 Redirigiendo a /admin/users');
        router.push('/admin/users');
      } else {
        console.log('👤 Redirigiendo a /dashboard');
        router.push('/dashboard');
      }
    }
  }, [status, account, role, router]);

  return (
    <section className="space-y-8">
      {/* Mostrar alerta de rechazo si el usuario fue rechazado */}
      {status === 'rejected' && account && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 mb-2">
                ❌ Tu solicitud anterior fue rechazada
              </h3>
              <p className="text-sm text-red-700 mb-2">
                La wallet <span className="font-mono bg-red-100 px-2 py-1 rounded text-xs">{account.slice(0, 10)}...</span> fue rechazada por el administrador.
              </p>
              <p className="text-xs text-red-600 italic">
                Puedes enviar una nueva solicitud seleccionando un rol a continuación.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mostrar alerta si el usuario canceló su solicitud */}
      {status === 'canceled' && account && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
              <Ban className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                Solicitud cancelada
              </h3>
              <p className="text-sm text-yellow-700 mb-2">
                Cancelaste tu solicitud anterior. Puedes volver a solicitar acceso cuando lo desees.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado: Usuario no conectado, sin registrar, rechazado o cancelado - mostrar selector de rol */}
      {(uiState === 'not-connected' || 
        uiState === 'connected-unregistered' || 
        uiState === 'connected-rejected' || 
        uiState === 'connected-canceled') && (
        <Card 
          title={
            uiState === 'connected-rejected' ? "🔄 Nueva Solicitud de Rol" :
            uiState === 'connected-canceled' ? "Nueva Solicitud de Rol" :
            uiState === 'not-connected' ? "Selecciona tu rol" : 
            "Solicitud de Rol"
          } 
          subtitle={
            uiState === 'connected-rejected' ? "Completa el formulario nuevamente" :
            uiState === 'connected-canceled' ? "Vuelve a solicitar acceso" :
            uiState === 'not-connected' ? "Para comenzar" : 
            "Esperando envío"
          } 
          contentClassName="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="role">Selecciona rol</Label>
              <Select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value || 'placeholder'} value={option.value}>
                    {option.label || 'Selecciona'}
                  </option>
                ))}
              </Select>
            </div>
            {/* Lista de verificación informativa para el usuario */}
            <div className="rounded-md border border-gray-200 bg-white p-4 text-xs text-gray-600">
              <p className="font-mono uppercase tracking-[0.28em] text-gray-400 mb-3">Lista de verificación</p>
              <ul className="mt-2 space-y-2 text-[0.65rem] text-gray-700">
                <li className="flex items-start gap-2">
                  <span className={`flex-shrink-0 ${account ? 'text-green-600' : 'text-gray-400'}`}>
                    {account ? '✓' : '1.'}
                  </span>
                  <span className={account ? 'line-through text-gray-400' : ''}>
                    Conectar a MetaMask
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`flex-shrink-0 ${account && role ? 'text-green-600' : 'text-gray-400'}`}>
                    {account && role ? '✓' : '2.'}
                  </span>
                  <span className={account && role ? 'line-through text-gray-400' : ''}>
                    Seleccionar rol
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 text-gray-400">3.</span>
                  <span>Enviar solicitud</span>
                </li>
              </ul>
            </div>
          </div>
          {/* Botón principal: conectar wallet o enviar solicitud */}
          <Button variant="ghost" onClick={async () => {
            if (!account) {
              await connect();
              return;
            }

            // Enviar transacción al blockchain si está conectado y tiene rol seleccionado
            if (account && role) {
              try {
                // No permitir solicitar rol de Admin desde el frontend
                if (role === 'ADMIN') {
                  alert('El rol de Admin no puede ser solicitado. Solo puede ser asignado por el admin actual.');
                  return;
                }

                // Obtener el ID del rol según el mapeo
                const roleId = ROLE_TO_ID[role];
                if (roleId === undefined) {
                  alert('Rol inválido seleccionado');
                  return;
                }

                // Crear instancia del servicio de contrato
                const contractService = new ContractService();

                // Llamar a la función del contrato para solicitar el rol
                const receipt = await contractService.requestUserRole(roleId);

                console.log('Usuario registrado en blockchain:', receipt);

                // Actualizar estado local después de transacción exitosa
                setStatus('pending');

              } catch (error: any) {
                // Detectar si el usuario canceló la transacción en MetaMask
                if (error?.code === 4001 || 
                    error?.code === 'ACTION_REJECTED' ||
                    error?.message?.includes('User denied') || 
                    error?.message?.includes('user rejected') || 
                    error?.message?.includes('User rejected') ||
                    error?.message?.includes('canceled') ||
                    error?.message?.includes('cancelled')) {
                  console.log('Usuario canceló la transacción en MetaMask');
                  // No mostrar alert, solo registrar en consola
                  return;
                }
                
                // Detectar errores de conexión con Anvil/red local
                if (error?.code === 'NETWORK_ERROR' ||
                    error?.message?.includes('could not detect network') ||
                    error?.message?.includes('network does not support') ||
                    error?.message?.includes('missing provider') ||
                    error?.code === -32603 ||
                    error?.message?.includes('Internal JSON-RPC error') ||
                    error?.message?.includes('Failed to fetch') ||
                    error?.message?.includes('fetch failed')) {
                  console.error('Error de conexión con la red local:', error);
                  alert('⚠️ No se puede conectar con la blockchain local (Anvil).\n\n' +
                        'Verifica que:\n' +
                        '1. Anvil está ejecutándose (anvil)\n' +
                        '2. El puerto 8545 está disponible\n' +
                        '3. MetaMask está configurado para red 31337');
                  return;
                }
                
                // Para otros errores, sí loguear y mostrar mensaje al usuario
                console.error('Error al registrar usuario:', error);
                if (error instanceof Error) {
                  alert(`Error al registrar: ${error.message}`);
                } else {
                  alert('Error desconocido al registrar usuario');
                }
              }
            }
          }} disabled={!account || !role} className="justify-center">
            Emitir solicitud
          </Button>
        </Card>
      )}

      {/* Estado: Solicitud pendiente de aprobación */}
      {uiState === 'connected-pending' && (
        <Card title="Cola de Validación" subtitle="Esperando aprobación">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500">
              <Clock className="h-4 w-4 animate-pulse" />
            </span>
            <p className="text-xs text-gray-600">
              Hemos recibido tu solicitud. Cuando el administrador confirme el rol podrás acceder al panel completo.
            </p>
          </div>
          {/* Botón para cancelar la solicitud pendiente (solo si está en estado Pending) */}
          <Button
            onClick={async () => {
              try {
                const contractService = new ContractService();
                await contractService.cancelMyAccount();
                console.log('Solicitud cancelada en el contrato');
                
                // Registrar cancelación en historial para trazabilidad
                if (account) {
                  RequestHistoryService.addEntry({
                    address: account,
                    action: 'canceled',
                  });
                }
                
                // Actualizar estado local
                setRole('');
                setStatus('canceled');
              } catch (error: any) {
                console.error('Error al cancelar solicitud:', error);
                if (error instanceof Error) {
                  alert(`Error al cancelar: ${error.message}`);
                } else {
                  alert('Error desconocido al cancelar solicitud');
                }
              }
            }}
            className="mt-4 w-full justify-center"
            variant="secondary"
          >
            Cancelar solicitud
          </Button>
        </Card>
      )}
    </section>
  );
}
