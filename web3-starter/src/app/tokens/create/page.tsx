'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ContractService } from '@/lib/contractService';

/**
 * Tipo para tokens disponibles como padres
 */
type ParentToken = {
  id: number;
  name: string;
};

/**
 * Componente CreateTokenPage - Interfaz de formulario de creación de tokens
 *
 * Responsabilidades:
 * - Proporcionar formulario completo para creación de nuevos tokens
 * - Gestionar validación de campos requeridos (nombre, suministro total)
 * - Manejar selección opcional de token padre para trazabilidad
 * - Procesar metadatos JSON para propiedades flexibles del token
 * - Controlar permisos por rol (Producer, Factory, Retailer)
 * - Preparar integración con función createToken del smart contract
 *
 * Esta página proporciona un formulario completo para crear nuevos tokens en el
 * sistema de trazabilidad de cadena de suministro. Maneja metadatos de tokens,
 * gestión de suministro y relaciones padre-hijo para trazabilidad.
 *
 * Características principales:
 * - Validación de formulario para campos requeridos (nombre, suministro)
 * - Control de acceso basado en roles para creación de tokens
 * - Selección de token padre para vinculación en cadena de suministro
 * - Entrada de metadatos JSON para propiedades flexibles del token
 * - Lista de verificación para integración con smart contract
 *
 * @returns {JSX.Element} El componente de página de creación de tokens
 */
export default function CreateTokenPage() {
  const { account, status, role } = useWallet();
  const router = useRouter();

  // Gestión de estado del formulario para creación de tokens
  const [name, setName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [parentId, setParentId] = useState('0');
  
  // Detectar cambios de cuenta/rol y redirigir al dashboard
  const [previousAccount, setPreviousAccount] = useState<string | null>(account);
  useEffect(() => {
    // Si cambió la cuenta, redirigir al dashboard
    if (previousAccount && account && previousAccount !== account) {
      console.log('🔄 Cuenta cambiada en página de creación de token, redirigiendo al dashboard...');
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
  const [features, setFeatures] = useState('{"lote":"A", "peso":"1kg"}');
  
  // Estados de UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableParents, setAvailableParents] = useState<ParentToken[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  
  // Estados para validación de balance y transferencias
  const [totalBalance, setTotalBalance] = useState(0);
  const [hasPendingTransfers, setHasPendingTransfers] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  
  // Estado para el balance del token padre seleccionado
  const [parentTokenBalance, setParentTokenBalance] = useState<number | null>(null);
  const [parentTokenName, setParentTokenName] = useState<string>('');
  const [loadingParentBalance, setLoadingParentBalance] = useState(false);

  // Cargar tokens disponibles como padres y verificar balance
  useEffect(() => {
    async function loadParentTokensAndBalance() {
      if (!account || status !== 'approved') {
        setLoadingParents(false);
        setLoadingBalance(false);
        return;
      }
      
      try {
        const contractService = new ContractService();
        const tokenIds = await contractService.getUserTokens(account);
        
        const tokens: ParentToken[] = [];
        let totalBalanceSum = 0;
        
        for (const id of tokenIds) {
          try {
            const token = await contractService.getToken(id);
            const balance = await contractService.getTokenBalance(id, account);
            totalBalanceSum += balance;
            
            tokens.push({
              id: token.id,
              name: token.name,
            });
          } catch (err) {
            console.error(`Error al cargar token ${id}:`, err);
          }
        }
        
        setAvailableParents(tokens);
        setTotalBalance(totalBalanceSum);
        
        // Verificar si hay transferencias pendientes
        if (role === 'FACTORY' || role === 'RETAILER') {
          try {
            const transferIds = await contractService.getUserTransfers(account);
            let hasPending = false;
            
            for (const transferId of transferIds) {
              try {
                const transfer = await contractService.getTransfer(transferId);
                // Verificar si es una transferencia pendiente donde el usuario es el receptor
                if (transfer.status === 0 && transfer.to.toLowerCase() === account.toLowerCase()) {
                  hasPending = true;
                  break;
                }
              } catch (err) {
                // Continuar con la siguiente transferencia
              }
            }
            
            setHasPendingTransfers(hasPending);
          } catch (err) {
            console.error('Error al verificar transferencias pendientes:', err);
          }
        }
      } catch (error) {
        console.error('Error al cargar tokens padre:', error);
      } finally {
        setLoadingParents(false);
        setLoadingBalance(false);
      }
    }

    loadParentTokensAndBalance();
  }, [account, status, role]);

  // Cargar balance del token padre cuando se selecciona
  useEffect(() => {
    async function loadParentTokenBalance() {
      if (!account || !parentId || parentId === '0' || status !== 'approved') {
        setParentTokenBalance(null);
        setParentTokenName('');
        return;
      }

      try {
        setLoadingParentBalance(true);
        const contractService = new ContractService();
        const parentIdNum = parseInt(parentId, 10);
        
        // Obtener información del token padre
        const parentToken = await contractService.getToken(parentIdNum);
        const balance = await contractService.getTokenBalance(parentIdNum, account);
        
        setParentTokenBalance(balance);
        setParentTokenName(parentToken.name);
      } catch (error) {
        console.error('Error al cargar balance del token padre:', error);
        setParentTokenBalance(null);
        setParentTokenName('');
      } finally {
        setLoadingParentBalance(false);
      }
    }

    loadParentTokenBalance();
  }, [account, parentId, status]);

  // Manejador de envío del formulario
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validar JSON de features
      let validatedFeatures = features;
      try {
        JSON.parse(features);
      } catch {
        throw new Error('Los metadatos deben ser un JSON válido');
      }

      const supplyAmount = parseInt(totalSupply);
      
      // Validar que la cantidad no exceda el balance del token padre (si hay token padre)
      if (parentId !== '0' && parentTokenBalance !== null) {
        if (supplyAmount > parentTokenBalance) {
          throw new Error(
            `No puedes crear ${supplyAmount} tokens. Solo tienes ${parentTokenBalance} unidades disponibles del token padre "${parentTokenName}".`
          );
        }
      }

      const contractService = new ContractService();
      await contractService.createToken(
        name,
        supplyAmount,
        validatedFeatures,
        parseInt(parentId)
      );

      // Si se creó un token derivado, el balance del token padre se actualizó en el contrato
      // Recargar el balance del token padre para reflejar el cambio
      if (parentId !== '0' && parentTokenBalance !== null) {
        try {
          const parentIdNum = parseInt(parentId, 10);
          const newBalance = await contractService.getTokenBalance(parentIdNum, account);
          setParentTokenBalance(newBalance);
          console.log(`[CreateToken] Balance del token padre actualizado: ${parentTokenBalance} → ${newBalance}`);
        } catch (err) {
          console.error('Error al actualizar balance del token padre:', err);
        }
      }

      alert('✅ Token creado exitosamente');
      router.push('/tokens');
    } catch (err: any) {
      console.error('Error al crear token:', err);
      setError(err.message || 'Error al crear el token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para crear tokens.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Tu cuenta debe estar aprobada para crear tokens.</p>;

  // Control de acceso: Consumer y Admin no pueden crear tokens
  const isAdmin = role && role.toUpperCase() === 'ADMIN';
  const isConsumer = role && role.toUpperCase() === 'CONSUMER';
  if (isAdmin || isConsumer) {
    return (
      <section className="space-y-4">
        <Card className="p-6 border-yellow-300 bg-yellow-50">
          <p className="text-yellow-800 font-semibold mb-2">
            {isAdmin 
              ? '❌ Acceso denegado. Los administradores no pueden crear tokens.'
              : '❌ Acceso denegado. Los consumidores no pueden crear tokens. Solo pueden recibir tokens mediante transferencias.'}
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            Por favor presiona el Dashboard si quieres ingresar al rol o Desconectar si quieres ingresar con otro rol.
          </p>
          <p className="text-xs text-yellow-600">
            Tu rol actual: {role}
          </p>
        </Card>
        <Link href="/dashboard">
          <Button>Ir al Dashboard</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Encabezado de página con título y nota */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Crear token</h1>
        <p className="text-sm text-gray-600">
          Crea un nuevo token en la blockchain para trazabilidad de productos.
        </p>
      </header>

      {/* Mostrar errores si los hay */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Mensaje de advertencia para Factory/Retailer sin balance */}
      {!loadingBalance && (role === 'FACTORY' || role === 'RETAILER') && totalBalance === 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-300 p-4 text-sm text-yellow-800">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold mb-2">
                No tienes tokens en tu balance
              </p>
              <p className="mb-2">
                Como <strong>{role}</strong>, necesitas recibir tokens de un usuario anterior en la cadena de suministro para poder crear nuevos tokens derivados.
              </p>
              {hasPendingTransfers ? (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-blue-900 mb-1">📬 Tienes transferencias pendientes</p>
                  <p className="text-blue-800 mb-2">
                    Tienes transferencias pendientes que puedes aceptar. Una vez aceptadas, podrás crear nuevos tokens.
                  </p>
                  <a 
                    href="/transfers" 
                    className="inline-block text-blue-700 hover:text-blue-900 font-medium underline"
                  >
                    Ver transferencias pendientes →
                  </a>
                </div>
              ) : (
                <p className="text-yellow-700">
                  Espera a que un usuario te envíe tokens mediante una transferencia.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario de creación de tokens */}
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Campo de entrada para nombre del token */}
          <div>
            <Label htmlFor="token-name">Nombre del token</Label>
            <input
              id="token-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Lote Maíz 2025"
              className="w-full rounded border p-2"
              required
            />
          </div>

          {/* Campo de entrada para suministro total */}
          <div>
            <Label htmlFor="token-supply">Cantidad total</Label>
            <input
              id="token-supply"
              type="number"
              min={1}
              max={parentTokenBalance !== null && parentId !== '0' ? parentTokenBalance : undefined}
              value={totalSupply}
              onChange={(event) => setTotalSupply(event.target.value)}
              placeholder="Ej. 500"
              className={`w-full rounded border p-2 ${
                parentId !== '0' && 
                parentTokenBalance !== null && 
                totalSupply && 
                parseInt(totalSupply) > parentTokenBalance
                  ? 'border-red-500 bg-red-50' 
                  : ''
              }`}
              required
            />
            {parentId !== '0' && parentTokenBalance !== null && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Balance disponible del token padre "{parentTokenName}":</strong> {parentTokenBalance} unidades
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Solo puedes crear hasta {parentTokenBalance} tokens derivados de este token padre.
                </p>
              </div>
            )}
            {parentId !== '0' && loadingParentBalance && (
              <p className="text-xs text-gray-500 mt-1">Cargando balance del token padre...</p>
            )}
            {parentId !== '0' && parentTokenBalance === 0 && !loadingParentBalance && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ No tienes balance del token padre seleccionado. Debes recibir tokens primero.
              </p>
            )}
            {parentId !== '0' && 
             parentTokenBalance !== null && 
             totalSupply && 
             parseInt(totalSupply) > parentTokenBalance && (
              <p className="text-xs text-red-600 mt-1">
                ❌ No puedes crear {totalSupply} tokens. Solo tienes {parentTokenBalance} unidades disponibles del token padre.
              </p>
            )}
          </div>

          {/* Selección de token padre (opcional) */}
          <div>
            <Label htmlFor="token-parent">Token padre (opcional)</Label>
            <Select 
              id="token-parent" 
              value={parentId} 
              onChange={(event) => setParentId(event.target.value)}
              disabled={loadingParents || role === 'PRODUCER'}
            >
              <option value="0">
                {role === 'PRODUCER' ? 'Sin padre (token raíz)' : '— Selecciona —'}
              </option>
              {availableParents.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.name}
                </option>
              ))}
            </Select>
            {loadingParents && (
              <p className="text-xs text-gray-500 mt-1">Cargando tokens disponibles...</p>
            )}
          </div>

          {/* Campo de entrada para metadatos JSON */}
          <div>
            <Label htmlFor="token-features">Metadatos (JSON)</Label>
            <textarea
              id="token-features"
              value={features}
              onChange={(event) => setFeatures(event.target.value)}
              placeholder='{"lote": "2025-A", "peso": "500kg"}'
              className="h-32 w-full rounded border p-2 font-mono text-sm"
            />
          </div>

          {/* Botón de envío con validación */}
          <Button 
            type="submit" 
            disabled={
              !name || 
              !totalSupply || 
              isSubmitting || 
              ((role === 'FACTORY' || role === 'RETAILER') && totalBalance === 0)
            }
          >
            {isSubmitting ? 'Creando token...' : 'Registrar token'}
          </Button>
          
          {/* Mensaje si el botón está deshabilitado por falta de balance */}
          {(role === 'FACTORY' || role === 'RETAILER') && totalBalance === 0 && (
            <p className="text-xs text-red-600 mt-2">
              No puedes crear tokens sin tener balance. Debes recibir tokens primero.
            </p>
          )}
        </form>
      </Card>

      {/* Lista de verificación según rol */}
      <article className="rounded border bg-white p-4 text-sm text-gray-600">
        <h2 className="mb-2 text-base font-semibold">Lista de verificación</h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className={account ? 'text-green-600' : 'text-gray-400'}>✓</span>
            <span className={account ? 'line-through text-gray-400' : ''}>Wallet conectada</span>
          </li>
          <li className="flex items-start gap-2">
            <span className={status === 'approved' ? 'text-green-600' : 'text-gray-400'}>✓</span>
            <span className={status === 'approved' ? 'line-through text-gray-400' : ''}>Cuenta aprobada</span>
          </li>
          {role === 'PRODUCER' && (
            <li className="flex items-start gap-2">
              <span className="text-blue-600">ℹ</span>
              <span>Producer: Puedes crear tokens raíz (sin padre)</span>
            </li>
          )}
          {(role === 'FACTORY' || role === 'RETAILER') && (
            <li className="flex items-start gap-2">
              <span className="text-blue-600">ℹ</span>
              <span>{role}: Debes seleccionar un token padre</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-blue-600">ℹ</span>
            <span>Los metadatos deben ser JSON válido</span>
          </li>
        </ul>
      </article>

      {/* Información de debug en el pie de página */}
      <footer className="text-xs text-gray-500">
        Rol actual: {role || 'sin definir'} • Wallet: {account}
      </footer>
    </section>
  );
}
