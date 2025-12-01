'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { TokenCard } from '@/components/TokenCard';
import { ContractService } from '@/lib/contractService';

/**
 * Estructura de datos de token desde el smart contract
 */
type TokenData = {
  id: string;
  name: string;
  owner: string;
  role?: string;
  metadataSummary?: string;
};

/**
 * Componente TokensPage - Muestra colección de tokens del usuario
 *
 * Responsabilidades:
 * - Mostrar colección completa de tokens propiedad del usuario conectado
 * - Proporcionar navegación a creación de nuevos tokens
 * - Permitir acceso a detalles individuales de cada token
 * - Controlar acceso basado en conexión de wallet y estado de aprobación
 * - Cargar tokens desde el smart contract
 *
 * Esta página sirve como interfaz principal de gestión de tokens, mostrando todos los tokens
 * propiedad del usuario conectado. Incluye control de acceso para asegurar que solo
 * usuarios aprobados puedan ver y gestionar sus tokens.
 *
 * Características principales:
 * - Control de acceso basado en conexión de wallet y estado de aprobación
 * - Listado de tokens con visualización de metadatos desde blockchain
 * - Navegación a vistas de creación y detalle de tokens
 * - Carga dinámica de tokens desde el smart contract
 *
 * @returns {JSX.Element} El componente de página de tokens
 */
export default function TokensPage() {
  const { account, status, role } = useWallet();
  const router = useRouter();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Detectar cambios de cuenta/rol y redirigir al dashboard
  const [previousAccount, setPreviousAccount] = useState<string | null>(account);
  useEffect(() => {
    // Si cambió la cuenta, redirigir al dashboard
    if (previousAccount && account && previousAccount !== account) {
      console.log('🔄 Cuenta cambiada en página de tokens, redirigiendo al dashboard...');
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

  // Cargar tokens del usuario desde el smart contract
  useEffect(() => {
    async function loadTokens() {
      if (!account || status !== 'approved') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const contractService = new ContractService();
        
        // Obtener IDs de tokens del usuario
        const tokenIds = await contractService.getUserTokens(account);
        
        // Cargar información completa de cada token
        const loadedTokens: TokenData[] = [];
        for (const tokenId of tokenIds) {
          try {
            const token = await contractService.getToken(tokenId);
            const balance = await contractService.getTokenBalance(tokenId, account);
            
            // Parsear metadatos JSON si es posible
            let metadataSummary = '';
            try {
              const features = JSON.parse(token.features);
              metadataSummary = Object.entries(features)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            } catch {
              metadataSummary = token.features || 'Sin metadatos';
            }
            
            loadedTokens.push({
              id: token.id.toString(),
              name: token.name,
              owner: token.creator,
              metadataSummary: `${metadataSummary} | Balance: ${balance}`,
            });
          } catch (err) {
            console.error(`Error al cargar token ${tokenId}:`, err);
          }
        }
        
        setTokens(loadedTokens);
      } catch (err: any) {
        console.error('Error al cargar tokens:', err);
        setError(err.message || 'Error al cargar los tokens');
      } finally {
        setLoading(false);
      }
    }

    loadTokens();
  }, [account, status]);

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para ver tus tokens.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Tu registro debe ser aprobado para administrar tokens.</p>;

  // Determinar si mostrar el botón "Crear token" del encabezado
  // Ocultarlo cuando se muestra "Crear tu primer token" o si el usuario es Admin, Consumer o Retailer
  const isAdmin = role && role.toUpperCase() === 'ADMIN';
  const isConsumer = role && role.toUpperCase() === 'CONSUMER';
  const isRetailer = role && role.toUpperCase() === 'RETAILER';
  const showCreateButton = !isAdmin && !isConsumer && !isRetailer && (loading || error || tokens.length > 0);

  return (
    <section className="space-y-4">
      {/* Encabezado de página con título y botón de crear */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mis tokens</h1>
        {showCreateButton && (
          <Link href="/tokens/create" className="inline-flex">
            <Button>Crear token</Button>
          </Link>
        )}
      </div>

      {/* Mensaje de carga */}
      {loading && (
        <p className="text-sm text-gray-600">Cargando tus tokens...</p>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Mensaje cuando no hay tokens */}
      {!loading && !error && tokens.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600 mb-4">No tienes tokens creados aún.</p>
          {!isAdmin && !isConsumer && !isRetailer && (
            <Link href="/tokens/create" className="inline-flex">
              <Button>Crear tu primer token</Button>
            </Link>
          )}
          {(isAdmin || isConsumer || isRetailer) && (
            <p className="text-sm text-gray-500">
              {isAdmin 
                ? 'Los administradores no pueden crear tokens.'
                : isConsumer
                ? 'Los consumidores no pueden crear tokens. Solo pueden recibir tokens mediante transferencias.'
                : 'Los retailers no pueden crear tokens. Solo pueden recibir tokens mediante transferencias.'}
            </p>
          )}
        </div>
      )}

      {/* Diseño de cuadrícula para tokens */}
      {!loading && tokens.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {tokens.map((token) => (
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
      )}
    </section>
  );
}
