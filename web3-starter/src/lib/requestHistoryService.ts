/**
 * Servicio para gestionar el historial de solicitudes de usuarios
 * Almacena en localStorage todas las solicitudes, aprobaciones y rechazos
 */

export interface RequestHistoryEntry {
  id: number; // ID incremental único
  address: string;
  timestamp: number;
  action: 'requested' | 'approved' | 'rejected' | 'canceled';
  role?: string;
  roleId?: number;
  adminAddress?: string; // Quién aprobó/rechazó
}

const STORAGE_KEY = 'supply_chain_request_history';
const COUNTER_KEY = 'supply_chain_request_counter';

export class RequestHistoryService {
  /**
   * Obtener y actualizar el contador de IDs
   */
  private static getNextId(): number {
    try {
      const counter = localStorage.getItem(COUNTER_KEY);
      const nextId = counter ? parseInt(counter, 10) + 1 : 1;
      localStorage.setItem(COUNTER_KEY, nextId.toString());
      return nextId;
    } catch (error) {
      console.error('Error al obtener contador:', error);
      return Date.now(); // Fallback a timestamp
    }
  }

  /**
   * Agregar una entrada al historial
   * Previene duplicados verificando si ya existe una entrada idéntica en los últimos 5 segundos
   */
  static addEntry(entry: Omit<RequestHistoryEntry, 'timestamp' | 'id'>): void {
    const history = this.getHistory();
    
    // Verificar si ya existe una entrada idéntica muy reciente (últimos 5 segundos)
    const now = Date.now();
    const recentDuplicate = history.find(
      (h) =>
        h.address.toLowerCase() === entry.address.toLowerCase() &&
        h.action === entry.action &&
        now - h.timestamp < 5000 // 5 segundos
    );
    
    if (recentDuplicate) {
      console.log('⚠️ Entrada duplicada detectada, ignorando:', entry);
      return;
    }
    
    const newEntry: RequestHistoryEntry = {
      id: this.getNextId(),
      ...entry,
      timestamp: Date.now(),
    };
    
    history.push(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    console.log('📝 Historial actualizado:', newEntry);
  }

  /**
   * Obtener todo el historial
   */
  static getHistory(): RequestHistoryEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error al leer historial:', error);
      return [];
    }
  }

  /**
   * Obtener historial de una dirección específica
   * Ordenado por timestamp descendente (más reciente primero)
   */
  static getHistoryForAddress(address: string): RequestHistoryEntry[] {
    const history = this.getHistory();
    return history
      .filter((entry) => entry.address.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp); // Más reciente primero
  }

  /**
   * Obtener estadísticas de una dirección
   */
  static getStatsForAddress(address: string): {
    totalRequests: number;
    approvals: number;
    rejections: number;
    cancellations: number;
  } {
    const history = this.getHistoryForAddress(address);
    
    return {
      totalRequests: history.filter((e) => e.action === 'requested').length,
      approvals: history.filter((e) => e.action === 'approved').length,
      rejections: history.filter((e) => e.action === 'rejected').length,
      cancellations: history.filter((e) => e.action === 'canceled').length,
    };
  }

  /**
   * Limpiar todo el historial (solo para desarrollo/testing)
   */
  static clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COUNTER_KEY);
    console.log('🗑️ Historial eliminado');
  }

  /**
   * Limpiar duplicados del historial
   * Mantiene solo la primera ocurrencia de cada acción por usuario
   */
  static removeDuplicates(): void {
    const history = this.getHistory();
    const seen = new Map<string, Set<string>>(); // address -> Set<action>
    
    const uniqueHistory = history.filter((entry) => {
      const key = entry.address.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, new Set());
      }
      
      const actions = seen.get(key)!;
      const actionKey = `${entry.action}-${Math.floor(entry.timestamp / 10000)}`; // Agrupar por 10 segundos
      
      if (actions.has(actionKey)) {
        console.log('🗑️ Eliminando duplicado:', entry);
        return false; // Duplicado, filtrar
      }
      
      actions.add(actionKey);
      return true; // Único, mantener
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueHistory));
    console.log(`✅ Historial limpiado: ${history.length} -> ${uniqueHistory.length} entradas`);
  }

  /**
   * Obtener todas las direcciones únicas en el historial
   */
  static getAllAddresses(): string[] {
    const history = this.getHistory();
    const addresses = new Set(history.map((e) => e.address.toLowerCase()));
    return Array.from(addresses);
  }
}
