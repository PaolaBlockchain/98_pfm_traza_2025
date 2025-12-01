'use client';
import { useEffect, useState } from 'react';
import { ContractService } from '@/lib/contractService';
import { Card } from '@/components/ui/card';
import { ArrowRight, Leaf, Building2, ShoppingBag, Users, Package, Calendar, Hash } from 'lucide-react';

interface Transfer {
  id: number;
  from: string;
  to: string;
  amount: number;
  dateCreated: number;
  status: number;
}

interface TokenNode {
  token: {
    id: number;
    name: string;
    creator: string;
    parentId: number;
    totalSupply: number;
    dateCreated: number;
  };
  parent?: TokenNode;
  transfers: Transfer[];
  children: TokenNode[];
}

interface UserRoleInfo {
  role: string;
  address: string;
}

interface Props {
  tokenId: number;
}

// Mapeo de roles a iconos, colores y etiquetas
const ROLE_CONFIG: Record<string, { icon: any; color: string; bgColor: string; borderColor: string; label: string }> = {
  PRODUCER: {
    icon: Leaf,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    label: 'Productor'
  },
  FACTORY: {
    icon: Building2,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500',
    label: 'Fábrica'
  },
  RETAILER: {
    icon: ShoppingBag,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500',
    label: 'Retailer'
  },
  CONSUMER: {
    icon: Users,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-500',
    label: 'Consumidor'
  },
  ADMIN: {
    icon: Users,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500',
    label: 'Admin'
  }
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface FlowNode {
  id: string;
  role: string;
  roleLabel: string;
  address: string;
  tokenName: string;
  tokenId: number;
  action: 'created' | 'received' | 'transferred';
  amount?: number;
  totalSupply?: number;
  date: number;
  transferId?: number;
  fromAddress?: string;
  toAddress?: string;
  dateCreated?: number;
}

export default function TokenTraceabilityLinear({ tokenId }: Props) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    async function loadLinearTrace() {
      setLoading(true);
      setError('');
      try {
        const contractService = new ContractService();
        const tree: TokenNode = await contractService.getTokenTraceabilityTree(tokenId);
        const userRoles = new Map<string, UserRoleInfo>();

        // Función para obtener el rol de un usuario
        async function getRole(address: string) {
          const addrLower = address.toLowerCase();
          if (userRoles.has(addrLower)) {
            return userRoles.get(addrLower)!.role;
          }
          try {
            const userInfo = await contractService.getUserInfo(address);
            const roleMap: Record<number, string> = {
              0: 'ADMIN',
              1: 'PRODUCER',
              2: 'FACTORY',
              3: 'RETAILER',
              4: 'CONSUMER',
            };
            const role = roleMap[userInfo.role] || 'UNKNOWN';
            userRoles.set(addrLower, { role, address });
            return role;
          } catch (error) {
            console.error(`Error al obtener rol de ${address}:`, error);
            return 'UNKNOWN';
          }
        }

        // Función recursiva para procesar un token y construir el flujo
        async function processTokenFlow(
          tokenNode: TokenNode,
          flowNodes: FlowNode[],
          processedTokens: Set<number>
        ): Promise<void> {
          // Evitar procesar el mismo token dos veces
          if (processedTokens.has(tokenNode.token.id)) {
            console.log(`[TokenTraceabilityLinear] Token ${tokenNode.token.id} ya procesado, saltando...`);
            return;
          }
          processedTokens.add(tokenNode.token.id);

          console.log(`[TokenTraceabilityLinear] Procesando token ${tokenNode.token.id} (${tokenNode.token.name})`);

          // 1. Agregar el nodo de creación del token
          const creatorRole = await getRole(tokenNode.token.creator);
          const creatorConfig = ROLE_CONFIG[creatorRole] || ROLE_CONFIG.PRODUCER;
          
          console.log(`[TokenTraceabilityLinear] Token ${tokenNode.token.id} creado por ${creatorRole} (${tokenNode.token.creator})`);
          
          flowNodes.push({
            id: `create-${tokenNode.token.id}`,
            role: creatorRole,
            roleLabel: creatorConfig.label,
            address: tokenNode.token.creator,
            tokenName: tokenNode.token.name,
            tokenId: tokenNode.token.id,
            action: 'created',
            totalSupply: tokenNode.token.totalSupply,
            date: tokenNode.token.dateCreated,
            dateCreated: tokenNode.token.dateCreated,
          });

          // 2. Procesar todas las transferencias aceptadas de este token
          const acceptedTransfers = tokenNode.transfers
            .filter(t => t.status === 1)
            .sort((a, b) => a.dateCreated - b.dateCreated); // Ordenar por fecha

          console.log(`[TokenTraceabilityLinear] Token ${tokenNode.token.id} tiene ${acceptedTransfers.length} transferencias aceptadas`);

          for (const transfer of acceptedTransfers) {
            const fromRole = await getRole(transfer.from);
            const toRole = await getRole(transfer.to);
            const fromConfig = ROLE_CONFIG[fromRole] || ROLE_CONFIG.PRODUCER;
            const toConfig = ROLE_CONFIG[toRole] || ROLE_CONFIG.FACTORY;

            console.log(`[TokenTraceabilityLinear] Transferencia ${transfer.id}: ${transfer.from} (${fromRole}) -> ${transfer.to} (${toRole}), cantidad: ${transfer.amount}`);

            // Agregar nodo de envío (si el remitente es diferente del creador o si es una transferencia)
            // Solo agregar si no acabamos de agregar el nodo de creación del mismo token
            const lastNode = flowNodes[flowNodes.length - 1];
            const isSameCreatorAsSender = lastNode && 
              lastNode.action === 'created' && 
              lastNode.address.toLowerCase() === transfer.from.toLowerCase() &&
              lastNode.tokenId === tokenNode.token.id;

            if (!isSameCreatorAsSender) {
              // Agregar nodo de envío
              flowNodes.push({
                id: `send-${transfer.id}`,
                role: fromRole,
                roleLabel: fromConfig.label,
                address: transfer.from,
                tokenName: tokenNode.token.name,
                tokenId: tokenNode.token.id,
                action: 'transferred',
                amount: transfer.amount,
                date: transfer.dateCreated,
                transferId: transfer.id,
                fromAddress: transfer.from,
                toAddress: transfer.to,
                dateCreated: transfer.dateCreated,
              });
            }

            // Agregar nodo de recepción
            flowNodes.push({
              id: `receive-${transfer.id}`,
              role: toRole,
              roleLabel: toConfig.label,
              address: transfer.to,
              tokenName: tokenNode.token.name,
              tokenId: tokenNode.token.id,
              action: 'received',
              amount: transfer.amount,
              date: transfer.dateCreated,
              transferId: transfer.id,
              fromAddress: transfer.from,
              toAddress: transfer.to,
              dateCreated: transfer.dateCreated,
            });

            // 3. Buscar si el receptor creó un token derivado
            const childToken = tokenNode.children.find(
              child => child.token.creator.toLowerCase() === transfer.to.toLowerCase()
            );

            if (childToken) {
              console.log(`[TokenTraceabilityLinear] Receptor ${transfer.to} creó token derivado ${childToken.token.id} (${childToken.token.name})`);
              // Procesar recursivamente el token hijo
              await processTokenFlow(childToken, flowNodes, processedTokens);
            } else {
              console.log(`[TokenTraceabilityLinear] Receptor ${transfer.to} no creó token derivado`);
            }
          }
        }

        // Construir el flujo completo
        const flowNodes: FlowNode[] = [];
        const processedTokens = new Set<number>();

        // Encontrar el token raíz (el que no tiene padre o el más antiguo)
        let rootToken: TokenNode = tree;
        while (rootToken.parent) {
          rootToken = rootToken.parent;
        }

        console.log('[TokenTraceabilityLinear] Token raíz encontrado:', rootToken.token);
        console.log('[TokenTraceabilityLinear] Árbol completo:', tree);

        // Procesar el flujo completo desde el token raíz
        await processTokenFlow(rootToken, flowNodes, processedTokens);

        console.log('[TokenTraceabilityLinear] Nodos del flujo generados:', flowNodes.length, flowNodes);

        // Ordenar los nodos por fecha
        flowNodes.sort((a, b) => (a.dateCreated || a.date) - (b.dateCreated || b.date));

        console.log('[TokenTraceabilityLinear] Nodos ordenados:', flowNodes);

        setNodes(flowNodes);
      } catch (err: any) {
        console.error('Error al cargar trazabilidad lineal:', err);
        setError(err.message || 'Error al cargar la trazabilidad lineal');
      } finally {
        setLoading(false);
      }
    }
    loadLinearTrace();
  }, [tokenId]);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">Cargando trazabilidad...</p>
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

  if (!nodes.length) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">No hay datos de trazabilidad disponibles.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Diagrama de Flujo de Trazabilidad</h2>
        <span className="text-sm text-gray-500">{nodes.length} paso{nodes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Diagrama de flujo horizontal */}
      <div className="overflow-x-auto overflow-y-visible pb-40 mb-0" style={{ minHeight: '500px', paddingTop: '100px' }}>
        <div className="flex items-start gap-8 min-w-max px-8 py-6 relative justify-center">
          {nodes.map((node, index) => {
            const config = ROLE_CONFIG[node.role] || ROLE_CONFIG.PRODUCER;
            const IconComponent = config.icon;
            const isHovered = hoveredNode === node.id;
            // Para los primeros 2 nodos, mostrar el tooltip arriba; para el resto, abajo
            const showTooltipAbove = index < 2;
            // Calcular posición vertical dinámica basada en el índice
            const tooltipTopPosition = showTooltipAbove ? 'bottom-[120px]' : 'top-[120px]';

            return (
              <div key={node.id} className="flex items-center gap-8">
                {/* Nodo circular */}
                <div
                  className="relative flex-shrink-0"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Círculo del nodo */}
                  <div
                    className={`
                      w-24 h-24 rounded-full ${config.bgColor} ${config.borderColor} border-4
                      flex flex-col items-center justify-center
                      shadow-lg transition-all duration-300 cursor-pointer
                      ${isHovered ? 'scale-110 ring-4 ring-offset-2 ring-opacity-50' : 'hover:scale-105'}
                    `}
                  >
                    <IconComponent size={32} className={config.color} />
                    <span className={`text-xs font-bold mt-1 ${config.color}`}>
                      {node.roleLabel}
                    </span>
                  </div>

                  {/* Tooltip con información detallada - Diseño compacto */}
                  {isHovered && (
                    <div 
                      className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-[85vw] max-w-[380px]"
                      style={{ 
                        position: 'fixed',
                        maxHeight: '60vh',
                        overflowY: 'auto'
                      }}
                    >
                      <Card className="p-4 shadow-2xl border-2 border-blue-500 bg-white">
                        {/* Botón de cierre */}
                        <div className="flex justify-end mb-1">
                          <button
                            onClick={() => setHoveredNode(null)}
                            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            aria-label="Cerrar"
                          >
                            ×
                          </button>
                        </div>
                        <div className="space-y-2">
                          {/* Header compacto */}
                          <div className={`flex items-center gap-2 border-b ${config.borderColor} pb-2`}>
                            <div className={`${config.bgColor} p-2 rounded-full`}>
                              <IconComponent size={18} className={config.color} />
                            </div>
                            <span className={`font-bold text-lg ${config.color}`}>
                              {node.roleLabel}
                            </span>
                          </div>

                          {/* Información del nodo - Compacto */}
                          <div className="space-y-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded">
                              <span className="text-gray-600 text-xs">Dirección: </span>
                              <span className="font-mono text-gray-900 text-sm">{formatAddress(node.address)}</span>
                            </div>

                            {node.action === 'created' && (
                              <>
                                <div className="bg-green-50 border border-green-400 rounded p-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package size={16} className="text-green-600" />
                                    <span className="font-semibold text-sm text-green-800">Creó el token</span>
                                  </div>
                                  <div className="text-sm">
                                    <p className="font-bold text-base text-gray-900 mb-1">{node.tokenName}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-700">
                                      <span className="bg-white px-2 py-0.5 rounded">ID: <strong className="text-gray-900">{node.tokenId}</strong></span>
                                      <span className="bg-white px-2 py-0.5 rounded">Suministro: <strong className="text-blue-600">{node.totalSupply?.toLocaleString()}</strong></span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {node.action === 'transferred' && (
                              <>
                                <div className="bg-orange-50 border border-orange-400 rounded p-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <ArrowRight size={16} className="text-orange-600" />
                                    <span className="font-semibold text-sm text-orange-800">Envió transferencia</span>
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <p className="font-bold text-base text-gray-900">{node.tokenName}</p>
                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded">
                                      <span className="text-lg font-bold text-orange-600">{node.amount?.toLocaleString()}</span>
                                      <span className="text-xs text-gray-700">unidades</span>
                                    </div>
                                    {node.toAddress && (
                                      <div className="bg-white p-1.5 rounded text-xs text-gray-700 mt-1">
                                        <span className="font-semibold">A: </span>
                                        <span className="font-mono text-gray-900">{formatAddress(node.toAddress)}</span>
                                      </div>
                                    )}
                                    {node.transferId && (
                                      <div className="bg-white p-1.5 rounded text-xs text-gray-600 mt-1">
                                        <Hash size={12} className="inline mr-1" />
                                        Transferencia #{node.transferId}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}

                            {node.action === 'received' && (
                              <>
                                <div className="bg-blue-50 border border-blue-400 rounded p-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <ArrowRight size={16} className="text-blue-600" />
                                    <span className="font-semibold text-sm text-blue-800">Recibió transferencia</span>
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <p className="font-bold text-base text-gray-900">{node.tokenName}</p>
                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded">
                                      <span className="text-lg font-bold text-blue-600">{node.amount?.toLocaleString()}</span>
                                      <span className="text-xs text-gray-700">unidades</span>
                                    </div>
                                    {node.fromAddress && (
                                      <div className="bg-white p-1.5 rounded text-xs text-gray-700 mt-1">
                                        <span className="font-semibold">De: </span>
                                        <span className="font-mono text-gray-900">{formatAddress(node.fromAddress)}</span>
                                      </div>
                                    )}
                                    {node.transferId && (
                                      <div className="bg-white p-1.5 rounded text-xs text-gray-600 mt-1">
                                        <Hash size={12} className="inline mr-1" />
                                        Transferencia #{node.transferId}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Fecha - Compacto */}
                            <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-300 bg-gray-50 p-2 rounded">
                              <Calendar size={14} className="text-gray-500" />
                              <span>{formatDate(node.dateCreated || node.date)}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Flecha conectora */}
                {index < nodes.length - 1 && (
                  <div className="flex-shrink-0 flex items-center">
                    <ArrowRight size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen */}
      {nodes.length > 0 && (
        <Card className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 mt-2">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <p className="text-sm text-gray-700">
              <strong>Instrucciones:</strong> Pasa el mouse sobre cada nodo para ver los detalles completos de cada paso en la cadena de trazabilidad.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
