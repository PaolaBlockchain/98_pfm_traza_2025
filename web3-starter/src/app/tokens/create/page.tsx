'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Datos placeholder para selección de tokens padre
 * Representa tokens existentes que pueden usarse como referencias padre
 * en el sistema de trazabilidad de cadena de suministro
 */
const PARENT_PLACEHOLDER = [
  { id: '1', name: 'Lote Materia Prima #1' },
  { id: '2', name: 'Producto Intermedio #2' },
];

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

  // Gestión de estado del formulario para creación de tokens
  const [name, setName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [parentId, setParentId] = useState('');
  const [features, setFeatures] = useState('');

  // Control de acceso: Requiere conexión de wallet
  if (!account) return <p>Conecta MetaMask para crear tokens.</p>;

  // Control de acceso: Requiere estado de registro aprobado
  if (status !== 'approved') return <p>Tu cuenta debe estar aprobada para crear tokens.</p>;

  return (
    <section className="space-y-4">
      {/* Encabezado de página con título y nota de desarrollo */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Crear token</h1>
        <p className="text-sm text-gray-600">
          TODO: Enlazar este formulario con el contrato SupplyChain.sol cuando esté disponible.
        </p>
      </header>

      {/* Formulario de creación de tokens */}
      <Card>
        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
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
            <Select id="token-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
              <option value="">— Selecciona —</option>
              {PARENT_PLACEHOLDER.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.name}
                </option>
              ))}
            </Select>
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
          <Button type="submit" disabled={!name || !totalSupply}>
            Registrar token
          </Button>
        </form>
      </Card>

      {/* Lista de verificación para integración con smart contract */}
      <article className="rounded border bg-white p-4 text-sm text-gray-600">
        <h2 className="mb-2 text-base font-semibold">Lista de verificación</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Validar permisos por rol (Producer, Factory, Retailer).</li>
          <li>Construir metadata JSON dinámicamente.</li>
          <li>Invocar `createToken` del contrato y mostrar feedback.</li>
        </ul>
      </article>

      {/* Información de debug en el pie de página */}
      <footer className="text-xs text-gray-500">
        Rol actual: {role || 'sin definir'} • Wallet: {account}
      </footer>
    </section>
  );
}
