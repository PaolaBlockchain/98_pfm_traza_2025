'use client';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { TokenCard } from '@/components/TokenCard';

/**
 * Estructura de datos placeholder para tokens hasta integración con smart contract
 * Representa el formato esperado de datos de tokens desde la blockchain
 */
const PLACEHOLDER_TOKENS: Array<{
  id: string;
  name: string;
  owner: string;
  role: string;
  metadataSummary: string;
}> = [];

/**
 * Componente TokensPage - Muestra colección de tokens del usuario
 *
 * Responsabilidades:
 * - Mostrar colección completa de tokens propiedad del usuario conectado
 * - Proporcionar navegación a creación de nuevos tokens
 * - Permitir acceso a detalles individuales de cada token
 * - Controlar acceso basado en conexión de wallet y estado de aprobación
 * - Gestionar datos placeholder hasta integración con smart contract
 *
 * Esta página sirve como interfaz principal de gestión de tokens, mostrando todos los tokens
 * propiedad del usuario conectado. Incluye control de acceso para asegurar que solo
 * usuarios aprobados puedan ver y gestionar sus tokens.
 *
 * Características principales:
 * - Control de acceso basado en conexión de wallet y estado de aprobación
 * - Listado de tokens con visualización de metadatos
 * - Navegación a vistas de creación y detalle de tokens
 * - Datos placeholder hasta integración con smart contract
 *
 * @returns {JSX.Element} El componente de página de tokens
 */
export default function TokensPage() {
  const { account, status } = useWallet();

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para ver tus tokens.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Tu registro debe ser aprobado para administrar tokens.</p>;

  return (
    <section className="space-y-4">
      {/* Encabezado de página con título y botón de crear */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mis tokens</h1>
        <Link href="/tokens/create" className="inline-flex">
          <Button>Crear token</Button>
        </Link>
      </div>

      {/* Nota de desarrollo para futura integración con smart contract */}
      <p className="text-sm text-gray-600">
        TODO: Reemplazar dataset estático con datos en vivo del smart contract cuando esté disponible.
      </p>

      {/* Diseño de cuadrícula para tokens */}
      <div className="grid gap-4 md:grid-cols-2">
        {PLACEHOLDER_TOKENS.map((token) => (
          <TokenCard
            key={token.id}
            id={token.id}
            name={token.name}
            owner={token.owner}
            role={token.role}
            metadataSummary={token.metadataSummary}
            cta={
              <Link href={`/tokens/${token.id}`} className="inline-flex">
                <Button>Ver detalles</Button>
              </Link>
            }
          />
        ))}
      </div>
    </section>
  );
}
