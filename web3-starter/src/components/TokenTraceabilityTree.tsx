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

  // Función para cargar roles de todas las direcciones en el árbol
  const loadUserRoles = async (node: TokenNode) => {
    const addresses = new Set<string>();
    collectAddresses(node, addresses);

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
        return { address: addr, role };
      } catch (error) {
        return { address: addr, role: 'UNKNOWN' };
      }
    });

    const roles = await Promise.all(rolePromises);
    const newRolesMap = new Map<string, UserRoleInfo>();
    roles.forEach(({ address, role }) => {
      newRolesMap.set(address, { role, address });
    });
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

  const getRoleBadge = (address: string) => {
    const roleInfo = userRoles.get(address.toLowerCase());
    if (!roleInfo) return null;
    
    const config = ROLE_CONFIG[roleInfo.role] || ROLE_CONFIG.ADMIN;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} border`}>
        <IconComponent size={12} />
        {config.label}
      </span>
    );
  };

  const renderTransfer = (transfer: Transfer) => {
    const statusBadge = getStatusBadge(transfer.status);
    const fromRole = userRoles.get(transfer.from.toLowerCase());
    const toRole = userRoles.get(transfer.to.toLowerCase());
    
    return (
      <Card key={transfer.id} className="ml-8 mb-3 p-4 bg-gradient-to-r from-gray-50 to-white border-l-4 border-blue-400 shadow-sm">
        <div className="space-y-3">
          {/* Header con ID y Estado */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-gray-400" />
              <span className="text-sm font-mono text-gray-600 font-semibold">Transferencia #{transfer.id}</span>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusBadge.className}`}>
              {statusBadge.icon} {statusBadge.text}
            </span>
          </div>

          {/* Información de envío */}
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <ArrowUpRight size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 mb-1">Remitente (Envía)</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-gray-800">{formatAddress(transfer.from)}</span>
                {getRoleBadge(transfer.from)}
              </div>
            </div>
          </div>

          {/* Flecha de transferencia */}
          <div className="flex items-center justify-center py-2">
            <ArrowRight size={24} className="text-blue-500" />
            <span className="mx-4 text-xl font-bold text-blue-600">{transfer.amount.toLocaleString()}</span>
            <span className="text-sm text-gray-600 font-medium">unidades</span>
          </div>

          {/* Información de recepción */}
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
            <ArrowDownRight size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 mb-1">Destinatario (Recibe)</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-gray-800">{formatAddress(transfer.to)}</span>
                {getRoleBadge(transfer.to)}
              </div>
            </div>
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <Calendar size={14} className="text-gray-400" />
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
    const creatorRole = userRoles.get(node.token.creator.toLowerCase());
    const creatorConfig = creatorRole ? ROLE_CONFIG[creatorRole.role] : null;
    const CreatorIcon = creatorConfig?.icon || Leaf;

    return (
      <div key={node.token.id} className="mb-4">
        {/* Token Card */}
        <div className={`relative ${level > 0 ? 'ml-8' : ''}`}>
          {/* Línea conectora vertical si no es raíz */}
          {!isRoot && level > 0 && (
            <div className="absolute left-0 top-0 w-0.5 h-4 bg-gray-300 -translate-x-2"></div>
          )}
          
          <Card className={`p-5 ${isRoot ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-lg' : 'shadow-md'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {hasContent && (
                    <button
                      onClick={() => toggleNode(node.token.id)}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-600" />
                      )}
                    </button>
                  )}
                  <div className={`p-2 rounded-lg ${creatorConfig?.bgColor || 'bg-gray-100'}`}>
                    <CreatorIcon size={24} className={creatorConfig?.color || 'text-gray-600'} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-800 mb-1">{node.token.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-gray-500 font-mono">ID: {node.token.id}</p>
                      {node.token.parentId === 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                          <Leaf size={12} />
                          Token Raíz
                        </span>
                      )}
                      {creatorConfig && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${creatorConfig.bgColor} ${creatorConfig.color} border`}>
                          <CreatorIcon size={12} />
                          {creatorConfig.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="ml-12 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium">Creador:</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{formatAddress(node.token.creator)}</span>
                    {getRoleBadge(node.token.creator)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium">Suministro total:</span>
                    <span className="font-semibold text-blue-600">{node.token.totalSupply.toLocaleString()} unidades</span>
                  </div>
                  {node.parent && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium">Token padre:</span>
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
          <div className="mt-4 ml-8">
            {/* Token padre (mostrar arriba para mostrar la cadena completa de trazabilidad) */}
            {hasParent && node.parent && (
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  <ArrowUpRight size={20} className="text-amber-600" />
                  <h4 className="font-bold text-base text-gray-800">
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
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <Users size={20} className="text-blue-600" />
                  <h4 className="font-bold text-base text-gray-800">
                    Transferencias ({node.transfers.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {node.transfers.map(transfer => renderTransfer(transfer))}
                </div>
              </div>
            )}

            {/* Tokens hijos */}
            {hasChildren && (
              <div>
                <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <ArrowDown size={20} className="text-green-600" />
                  <h4 className="font-bold text-base text-gray-800">
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Árbol de Trazabilidad</h2>
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

