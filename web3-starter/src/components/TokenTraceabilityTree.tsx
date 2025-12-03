'use client';
import { useState, useEffect } from 'react';
import { ContractService } from '@/lib/contractService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowDown, Package, Users, ChevronRight, ChevronDown, Building2, ShoppingBag, Leaf, ArrowUpRight, ArrowDownRight, Calendar, Hash } from 'lucide-react';

type Transfer = {
  id: number;
  from: string;
  to: string;
  amount: number;
  dateCreated: number;
  status: number;
};

type TokenNode = {
  token: {
    id: number;
    name: string;
    creator: string;
    parentId: number;
    totalSupply: number;
    dateCreated: number;
  };
  parent?: TokenNode; // Ahora el padre es un nodo completo del árbol
  transfers: Transfer[];
  children: TokenNode[];
};

type TokenTraceabilityTreeProps = {
  tokenId: number;
};

type UserRoleInfo = {
  role: string;
  address: string;
};

// Mapeo de roles a iconos y colores
const ROLE_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  PRODUCER: {
    icon: Leaf,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    label: 'Producer'
  },
  FACTORY: {
    icon: Building2,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    label: 'Factory'
  },
  RETAILER: {
    icon: ShoppingBag,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    label: 'Retailer'
  },
  CONSUMER: {
    icon: Users,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    label: 'Consumer'
  },
  ADMIN: {
    icon: Users,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    label: 'Admin'
  }
};

/**
 * Componente TokenTraceabilityTree - Muestra el árbol completo de trazabilidad de un token
 * 
 * Muestra:
 * - Token raíz y su información
 * - Token padre (si existe)
 * - Transferencias recibidas y enviadas
 * - Tokens hijos y sus transferencias
 * - Todo en formato de árbol visual
 */
export default function TokenTraceabilityTree({ tokenId }: TokenTraceabilityTreeProps) {
  const [tree, setTree] = useState<TokenNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([tokenId]));
  const [userRoles, setUserRoles] = useState<Map<string, UserRoleInfo>>(new Map());

  // Función para obtener el rol de un usuario
  const getUserRole = async (address: string): Promise<string> => {
    if (userRoles.has(address.toLowerCase())) {
      return userRoles.get(address.toLowerCase())!.role;
    }

    try {
      const contractService = new ContractService();
      const userInfo = await contractService.getUserInfo(address);
      const roleMap: Record<number, string> = {
        0: 'ADMIN',
        1: 'PRODUCER',
        2: 'FACTORY',
        3: 'RETAILER',
        4: 'CONSUMER',
      };
      const role = roleMap[userInfo.role] || 'UNKNOWN';
      setUserRoles(prev => new Map(prev).set(address.toLowerCase(), { role, address }));
      return role;
    } catch (error) {
      console.error(`Error al obtener rol de ${address}:`, error);
      return 'UNKNOWN';
    }
  };

  // Función recursiva para recopilar todas las direcciones del árbol
  const collectAddresses = (node: TokenNode, addresses: Set<string>) => {
    // Agregar creador del token
    addresses.add(node.token.creator.toLowerCase());
    
    // Agregar direcciones de transferencias
    node.transfers.forEach(transfer => {
      addresses.add(transfer.from.toLowerCase());
      addresses.add(transfer.to.toLowerCase());
    });
    
    // Recursivamente agregar direcciones de hijos
    node.children.forEach(child => {
      collectAddresses(child, addresses);
    });
  };

  // Función recursiva para obtener el creador de tokens raíz
  const getRootTokenCreator = (node: TokenNode): string | null => {
    if (node.token.parentId === 0) {
      return node.token.creator;
    }
    if (node.parent) {
      return getRootTokenCreator(node.parent);
    }
    return null;
  };

  // Función para cargar roles de todas las direcciones en el árbol
  const loadUserRoles = async (node: TokenNode) => {
    const addresses = new Set<string>();
    collectAddresses(node, addresses);
    
    // Obtener el creador del token raíz si existe
    const rootCreator = getRootTokenCreator(node);

    console.log(`[loadUserRoles] Direcciones a cargar: ${Array.from(addresses).join(', ')}`);
    if (rootCreator) {
      console.log(`[loadUserRoles] Creador del token raíz: ${rootCreator}`);
    }

    // Cargar roles para todas las direcciones
    const contractService = new ContractService();
    const rolePromises = Array.from(addresses).map(async (addr) => {
      try {
        const userInfo = await contractService.getUserInfo(addr);
        const roleMap: Record<number, string> = {
          0: 'ADMIN',
          1: 'PRODUCER',
          2: 'FACTORY',
          3: 'RETAILER',
          4: 'CONSUMER',
        };
        const role = roleMap[userInfo.role] || 'UNKNOWN';
        console.log(`[loadUserRoles] ✅ Dirección: ${addr}, Rol numérico: ${userInfo.role}, Rol mapeado: ${role}, Status: ${userInfo.status}`);
        return { address: addr, role };
      } catch (error: any) {
        // Si el usuario no existe o hay un error
        // Si es el creador del token raíz, asumir que es Producer
        if (rootCreator && addr.toLowerCase() === rootCreator.toLowerCase()) {
          console.log(`[loadUserRoles] ⚠️ No se pudo obtener rol para creador del token raíz ${addr}, asumiendo Producer`);
          return { address: addr, role: 'PRODUCER' };
        }
        console.error(`[loadUserRoles] ❌ Error al obtener rol para ${addr}:`, {
          message: error?.message,
          code: error?.code,
          data: error?.data,
          error: error
        });
        return { address: addr, role: 'UNKNOWN' };
      }
    });

    const roles = await Promise.all(rolePromises);
    const newRolesMap = new Map<string, UserRoleInfo>();
    roles.forEach(({ address, role }) => {
      const key = address.toLowerCase();
      newRolesMap.set(key, { role, address });
      console.log(`[loadUserRoles] 📝 Guardando en mapa: ${key} -> ${role} (dirección original: ${address})`);
    });
    console.log(`[loadUserRoles] ✅ Total de roles cargados: ${newRolesMap.size}`);
    console.log(`[loadUserRoles] 📋 Mapa completo:`, Array.from(newRolesMap.entries()));
    setUserRoles(newRolesMap);
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    async function loadTree() {
      try {
        setLoading(true);
        setError('');
        
        // Timeout de 30 segundos para evitar que quede cargando indefinidamente
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setError('La carga del árbol de trazabilidad está tardando demasiado. Por favor, intenta recargar la página.');
            setLoading(false);
          }
        }, 30000);
        
        const contractService = new ContractService();
        const treeData = await contractService.getTokenTraceabilityTree(tokenId);
        
        if (!isMounted) return;
        
        clearTimeout(timeoutId);
        setTree(treeData);
        
        // Cargar roles de todos los usuarios en el árbol
        if (treeData) {
          await loadUserRoles(treeData);
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        clearTimeout(timeoutId);
        console.error('Error al cargar árbol de trazabilidad:', err);
        setError(err.message || 'Error al cargar el árbol de trazabilidad');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    loadTree();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [tokenId]);

  const toggleNode = (nodeId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('es-ES');
  };

  const getStatusBadge = (status: number) => {
    if (status === 0) return { text: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⏳' };
    if (status === 1) return { text: 'Aceptada', className: 'bg-green-100 text-green-800 border-green-300', icon: '✓' };
    return { text: 'Rechazada', className: 'bg-red-100 text-red-800 border-red-300', icon: '✗' };
  };

  const getRoleBadge = (address: string, isTokenCreator: boolean = false, isRootToken: boolean = false) => {
    let roleInfo = userRoles.get(address.toLowerCase());
    
    // Si es el creador de un token raíz y no tenemos el rol, asumir Producer
    if (isTokenCreator && isRootToken && (!roleInfo || roleInfo.role === 'UNKNOWN')) {
      roleInfo = { role: 'PRODUCER', address };
      // Actualizar el mapa
      if (!userRoles.has(address.toLowerCase())) {
        setUserRoles(prev => new Map(prev).set(address.toLowerCase(), roleInfo!));
      }
    }
    
    if (!roleInfo || roleInfo.role === 'UNKNOWN') return null;
    
    const config = ROLE_CONFIG[roleInfo.role] || ROLE_CONFIG.ADMIN;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} border`}>
        <IconComponent size={10} />
        {config.label}
      </span>
    );
  };

  const renderTransfer = (transfer: Transfer, tokenName?: string, tokenTotalSupply?: number, tokenCreator?: string, isRootToken?: boolean) => {
    const statusBadge = getStatusBadge(transfer.status);
    const fromAddressLower = transfer.from.toLowerCase();
    const toAddressLower = transfer.to.toLowerCase();
    const fromRole = userRoles.get(fromAddressLower);
    const toRole = userRoles.get(toAddressLower);
    
    // Debug: verificar qué roles se están encontrando
    console.log(`[renderTransfer] Transferencia #${transfer.id}:`);
    console.log(`  - From: ${transfer.from} (lowercase: ${fromAddressLower})`);
    console.log(`  - To: ${transfer.to} (lowercase: ${toAddressLower})`);
    console.log(`  - FromRole encontrado:`, fromRole);
    console.log(`  - ToRole encontrado:`, toRole);
    console.log(`  - Mapa userRoles tiene ${userRoles.size} entradas`);
    console.log(`  - Claves en mapa:`, Array.from(userRoles.keys()));
    
    // Crear texto descriptivo - siempre usar el rol real del ROLE_CONFIG, nunca "Usuario"
    let fromRoleLabel = 'Desconocido';
    if (fromRole && fromRole.role && fromRole.role !== 'UNKNOWN') {
      const roleConfig = ROLE_CONFIG[fromRole.role];
      fromRoleLabel = roleConfig?.label || fromRole.role;
      console.log(`  - FromRoleLabel: ${fromRoleLabel} (de rol: ${fromRole.role})`);
    } else {
      // Si no se encontró el rol pero es el creador de un token raíz, asumir Producer
      if (isRootToken && tokenCreator && fromAddressLower === tokenCreator.toLowerCase()) {
        fromRoleLabel = 'Producer';
        console.log(`  - FromRoleLabel: Producer (inferido para creador de token raíz)`);
        // Actualizar el mapa para futuras referencias
        if (!userRoles.has(fromAddressLower)) {
          setUserRoles(prev => new Map(prev).set(fromAddressLower, { role: 'PRODUCER', address: transfer.from }));
        }
      } else {
        console.warn(`  ⚠️ Rol no encontrado en mapa para dirección ${transfer.from} (${fromAddressLower})`);
        console.warn(`  - Mapa contiene:`, Array.from(userRoles.entries()));
      }
    }
    
    let toRoleLabel = 'Desconocido';
    if (toRole && toRole.role && toRole.role !== 'UNKNOWN') {
      const roleConfig = ROLE_CONFIG[toRole.role];
      toRoleLabel = roleConfig?.label || toRole.role;
      console.log(`  - ToRoleLabel: ${toRoleLabel} (de rol: ${toRole.role})`);
    } else {
      console.warn(`  ⚠️ Rol no encontrado en mapa para dirección ${transfer.to} (${toAddressLower})`);
    }
    
    const descriptiveText = `El ${fromRoleLabel} le envía al ${toRoleLabel} ${transfer.amount.toLocaleString()} unidades${tokenName ? ` de ${tokenName}` : ''}${tokenTotalSupply ? ` de su suministro total de ${tokenTotalSupply.toLocaleString()} unidades` : ''}`;
    
    return (
      <Card key={transfer.id} className="ml-4 mb-2 p-2 bg-gradient-to-r from-gray-50 to-white border-l-2 border-blue-400 shadow-sm">
        <div className="space-y-1.5">
          {/* Header con ID y Estado */}
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-1.5">
              <Hash size={12} className="text-gray-400" />
              <span className="text-xs font-mono text-gray-600 font-semibold">Transferencia #{transfer.id}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${statusBadge.className}`}>
              {statusBadge.icon} {statusBadge.text}
            </span>
          </div>

          {/* Texto descriptivo */}
          <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
            <p className="text-xs text-gray-800 font-medium leading-relaxed">
              {descriptiveText}
            </p>
          </div>

          {/* Información de envío */}
          <div className="flex items-start gap-2 p-1.5 bg-red-50 rounded border border-red-100">
            <ArrowUpRight size={12} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 mb-0.5">Remitente</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs text-gray-800">{formatAddress(transfer.from)}</span>
                {getRoleBadge(transfer.from)}
              </div>
            </div>
          </div>

          {/* Flecha de transferencia */}
          <div className="flex items-center justify-center py-1">
            <ArrowRight size={16} className="text-blue-500" />
            <span className="mx-2 text-base font-bold text-blue-600">{transfer.amount.toLocaleString()}</span>
            <span className="text-xs text-gray-600 font-medium">unidades</span>
          </div>

          {/* Información de recepción */}
          <div className="flex items-start gap-2 p-1.5 bg-green-50 rounded border border-green-100">
            <ArrowDownRight size={12} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 mb-0.5">Destinatario</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs text-gray-800">{formatAddress(transfer.to)}</span>
                {getRoleBadge(transfer.to)}
              </div>
            </div>
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-xs text-gray-600">{formatDate(transfer.dateCreated)}</span>
          </div>
        </div>
      </Card>
    );
  };

  const renderNode = (node: TokenNode, level: number = 0, isRoot: boolean = false) => {
    const isExpanded = expandedNodes.has(node.token.id);
    const hasChildren = node.children.length > 0;
    const hasTransfers = node.transfers.length > 0;
    const hasParent = node.parent !== undefined;
    const hasContent = hasChildren || hasTransfers || hasParent;
    const isRootToken = node.token.parentId === 0;
    
    // Obtener rol del creador - si es token raíz y no tenemos el rol, asumir Producer
    let creatorRole = userRoles.get(node.token.creator.toLowerCase());
    if (isRootToken && (!creatorRole || creatorRole.role === 'UNKNOWN')) {
      // Si es token raíz y no tenemos el rol, asumir que es Producer
      creatorRole = { role: 'PRODUCER', address: node.token.creator };
      // Actualizar el mapa para evitar futuras consultas
      if (!userRoles.has(node.token.creator.toLowerCase())) {
        setUserRoles(prev => new Map(prev).set(node.token.creator.toLowerCase(), creatorRole!));
      }
    }
    
    const creatorConfig = creatorRole && creatorRole.role !== 'UNKNOWN' ? ROLE_CONFIG[creatorRole.role] : null;
    const CreatorIcon = creatorConfig?.icon || Leaf;

    return (
      <div key={node.token.id} className="mb-2">
        {/* Token Card */}
        <div className={`relative ${level > 0 ? 'ml-4' : ''}`}>
          {/* Línea conectora vertical si no es raíz */}
          {!isRoot && level > 0 && (
            <div className="absolute left-0 top-0 w-0.5 h-4 bg-gray-300 -translate-x-2"></div>
          )}
          
          <Card className={`p-2.5 ${isRoot ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-lg' : 'shadow-md'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  {hasContent && (
                    <button
                      onClick={() => toggleNode(node.token.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-600" />
                      )}
                    </button>
                  )}
                  <div className={`p-1 rounded ${creatorConfig?.bgColor || 'bg-gray-100'}`}>
                    <CreatorIcon size={16} className={creatorConfig?.color || 'text-gray-600'} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-gray-800 mb-0.5">{node.token.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-gray-500 font-mono">ID: {node.token.id}</p>
                      {node.token.parentId === 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                          <Leaf size={10} />
                          Token Raíz{creatorConfig ? ` (${creatorConfig.label})` : creatorRole ? ` (${ROLE_CONFIG[creatorRole.role]?.label || creatorRole.role})` : ''}
                        </span>
                      )}
                      {node.token.parentId !== 0 && creatorConfig && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${creatorConfig.bgColor} ${creatorConfig.color} border`}>
                          <CreatorIcon size={10} />
                          {creatorConfig.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="ml-8 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-medium">Creador:</span>
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{formatAddress(node.token.creator)}</span>
                    {getRoleBadge(node.token.creator, true, isRootToken)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-medium">Suministro:</span>
                    <span className="font-semibold text-blue-600">{node.token.totalSupply.toLocaleString()} unidades</span>
                  </div>
                  {node.parent && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600 font-medium">Padre:</span>
                      <span className="text-blue-600 font-semibold">{node.parent.token.name}</span>
                      <span className="text-xs text-gray-500">(ID: {node.parent.token.id})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Contenido expandible: Token padre, Transferencias y Tokens hijos */}
        {isExpanded && hasContent && (
          <div className="mt-2 ml-4">
            {/* Token padre (mostrar arriba para mostrar la cadena completa de trazabilidad) */}
            {hasParent && node.parent && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2 p-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded border border-amber-200">
                  <ArrowUpRight size={14} className="text-amber-600" />
                  <h4 className="font-bold text-sm text-gray-800">
                    Token Padre (Origen)
                  </h4>
                </div>
                <div className="relative">
                  {/* Línea conectora vertical hacia arriba */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 to-transparent -translate-x-4"></div>
                  {/* Línea conectora horizontal hacia arriba */}
                  <div className="absolute left-0 top-6 w-4 h-0.5 bg-amber-300 -translate-x-4"></div>
                  {/* Renderizar el nodo padre recursivamente */}
                  {renderNode(node.parent, level + 1, false)}
                </div>
              </div>
            )}

            {/* Transferencias */}
            {hasTransfers && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2 p-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded border border-blue-200">
                  <Users size={14} className="text-blue-600" />
                  <h4 className="font-bold text-sm text-gray-800">
                    Transferencias ({node.transfers.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {[...node.transfers]
                    .sort((a, b) => b.dateCreated - a.dateCreated) // Ordenar por fecha descendente (más recientes primero)
                    .map(transfer => renderTransfer(transfer, node.token.name, node.token.totalSupply, node.token.creator, isRootToken))}
                </div>
              </div>
            )}

            {/* Tokens hijos */}
            {hasChildren && (
              <div>
                <div className="mb-2 flex items-center gap-2 p-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded border border-green-200">
                  <ArrowDown size={14} className="text-green-600" />
                  <h4 className="font-bold text-sm text-gray-800">
                    Tokens Derivados ({node.children.length})
                  </h4>
                </div>
                <div className="space-y-4">
                  {node.children.map((child, index) => (
                    <div key={child.token.id} className="relative">
                      {/* Línea conectora vertical */}
                      {index < node.children.length - 1 && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-transparent -translate-x-4"></div>
                      )}
                      {/* Línea conectora horizontal */}
                      <div className="absolute left-0 top-6 w-4 h-0.5 bg-gray-300 -translate-x-4"></div>
                      {renderNode(child, level + 1, false)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">Cargando árbol de trazabilidad...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-300 bg-red-50">
        <p className="text-red-700">❌ {error}</p>
      </Card>
    );
  }

  if (!tree) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">No se pudo cargar el árbol de trazabilidad</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Árbol de Trazabilidad</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            // Expandir/colapsar todo
            if (expandedNodes.size > 1) {
              setExpandedNodes(new Set([tokenId]));
            } else {
              // Expandir todos los nodos recursivamente
              const expandAll = (node: TokenNode, set: Set<number>) => {
                set.add(node.token.id);
                node.children.forEach(child => expandAll(child, set));
              };
              const newSet = new Set<number>();
              expandAll(tree, newSet);
              setExpandedNodes(newSet);
            }
          }}
        >
          {expandedNodes.size > 1 ? 'Colapsar todo' : 'Expandir todo'}
        </Button>
      </div>
      
      {renderNode(tree, 0, true)}
    </div>
  );
}

