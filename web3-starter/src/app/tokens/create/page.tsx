'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [features, setFeatures] = useState('{"lote":"A", "peso":"1kg"}');
  
  // Estados de UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableParents, setAvailableParents] = useState<ParentToken[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  // Cargar tokens disponibles como padres
  useEffect(() => {
    async function loadParentTokens() {
      if (!account) return;
      
      try {
        const contractService = new ContractService();
        const tokenIds = await contractService.getUserTokens(account);
        
        const tokens: ParentToken[] = [];
        for (const id of tokenIds) {
          try {
            const token = await contractService.getToken(id);
            tokens.push({
              id: token.id,
              name: token.name,
            });
          } catch (err) {
            console.error(`Error al cargar token ${id}:`, err);
          }
        }
        
        setAvailableParents(tokens);
      } catch (error) {
        console.error('Error al cargar tokens padre:', error);
      } finally {
        setLoadingParents(false);
      }
    }

    loadParentTokens();
  }, [account]);

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

      const contractService = new ContractService();
      await contractService.createToken(
        name,
        parseInt(totalSupply),
        validatedFeatures,
        parseInt(parentId)
      );

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
              value={totalSupply}
              onChange={(event) => setTotalSupply(event.target.value)}
              placeholder="Ej. 500"
              className="w-full rounded border p-2"
              required
            />
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
            disabled={!name || !totalSupply || isSubmitting}
          >
            {isSubmitting ? 'Creando token...' : 'Registrar token'}
          </Button>
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
