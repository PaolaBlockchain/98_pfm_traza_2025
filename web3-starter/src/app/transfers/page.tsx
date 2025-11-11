'use client';
import { useWallet } from '@/hooks/useWallet';
import { TransferList, type TransferItem } from '@/components/TransferList';

/**
 * Datos placeholder para transferencias pendientes esperando aprobación
 * Serán reemplazados con datos reales de eventos del smart contract
 */
const PENDING_TRANSFERS: TransferItem[] = [];

/**
 * Datos placeholder para historial de transferencias completadas
 * Serán reemplazados con datos reales de eventos del smart contract
 */
const HISTORY_TRANSFERS: TransferItem[] = [];

/**
 * Componente TransfersPage - Interfaz de gestión de transferencias
 *
 * Responsabilidades:
 * - Mostrar transferencias pendientes que requieren aprobación
 * - Presentar historial completo de transferencias completadas
 * - Proporcionar interfaz unificada para gestión de transferencias
 * - Controlar acceso solo para usuarios con estado aprobado
 * - Preparar integración con eventos del smart contract
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
 * - Datos placeholder hasta integración con smart contract
 *
 * @returns {JSX.Element} El componente de página de transferencias
 */
export default function TransfersPage() {
  const { account, status } = useWallet();

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para gestionar transferencias.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Necesitas aprobación para operar transferencias.</p>;

  return (
    <section className="space-y-4">
      {/* Encabezado de página con título y nota de desarrollo */}
      <header>
        <h1 className="text-2xl font-semibold">Transferencias</h1>
        <p className="text-sm text-gray-600">
          TODO: Conectar con el contrato para listar transferencias reales y permitir acciones.
        </p>
      </header>

      {/* Sección de transferencias pendientes */}
      <TransferList title="Pendientes" items={PENDING_TRANSFERS} />

      {/* Sección de historial de transferencias */}
      <TransferList title="Historial" items={HISTORY_TRANSFERS} />
    </section>
  );
}
