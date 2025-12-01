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
import { AlertCircle, Ban, Clock } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ContractService } from '@/lib/contractService';

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

  // Redirección automática al dashboard si está aprobado
  React.useEffect(() => {
    if (uiState === 'connected-approved') {
      window.location.href = '/dashboard';
    }
  }, [uiState]);

  return (
    <section className="space-y-8">
      {/* Estado: Usuario no conectado - mostrar selector de rol */}
      {(uiState === 'not-connected' || uiState === 'connected-unregistered') && (
        <Card title={uiState === 'not-connected' ? "Selecciona tu rol" : "Solicitud de Rol"} subtitle={uiState === 'not-connected' ? "Para comenzar" : "Esperando envío"} contentClassName="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="role">Selecciona rol</Label>
              <Select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={!account}
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
              <p className="font-mono uppercase tracking-[0.28em] text-gray-400">Lista de verificación</p>
              <ul className="mt-2 space-y-1 font-mono text-[0.6rem] uppercase tracking-[0.25em] text-gray-600">
                <li>• Usa cuenta asignada al rol</li>
                <li>• Verifica red 31337</li>
                <li>• Confirma datos antes de enviar</li>
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

              } catch (error: unknown) {
                console.error('Error al registrar usuario:', error);
                
                // Mostrar mensaje de error al usuario
                if (error instanceof Error) {
                  alert(`Error al registrar: ${error.message}`);
                } else {
                  alert('Error desconocido al registrar usuario');
                }
              }
            }
          }} disabled={!role} className="justify-center">
            {uiState === 'not-connected' ? 'Conectar y solicitar' : 'Emitir solicitud'}
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
          {/* Botón para cancelar la solicitud pendiente */}
          <Button
            onClick={async () => {
              try {
                const contractService = new ContractService();
                await contractService.cancelMyAccount();
                // El evento UserStatusChanged actualizará Web3Context automáticamente
              } catch (error) {
                console.error('Error al cancelar cuenta:', error);
                alert('Error al cancelar la solicitud. Verifica la consola.');
              }
            }}
            className="mt-4 w-full justify-center"
            variant="secondary"
          >
            Cancelar solicitud
          </Button>
        </Card>
      )}

      {/* Estado: Solicitud rechazada por el admin */}
      {uiState === 'connected-rejected' && (
        <Card title="Solicitud rechazada" subtitle="Acción requerida">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500">
              <AlertCircle className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-gray-500">
              El administrador rechazó tu solicitud. Revisa tu información, ajusta los datos necesarios y vuelve a enviar el registro.
            </p>
          </div>
          {/* Botón para reiniciar el proceso de registro */}
          <Button variant="secondary" onClick={() => setStatus('unregistered')} className="mt-4 w-full justify-center">
            Reiniciar registro
          </Button>
        </Card>
      )}

      {/* Estado: Solicitud cancelada por el usuario */}
      {uiState === 'connected-canceled' && (
        <Card title="Registro cancelado" subtitle="No puedes volver a registrarte">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500">
              <Ban className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-gray-600">
              Has cancelado tu solicitud de registro. El estado de tu cuenta es permanente y no puedes volver a solicitar un rol con esta dirección. Si necesitas participar en la cadena de suministro, deberás usar una cuenta diferente.
            </p>
          </div>
        </Card>
      )}
    </section>
  );
}
