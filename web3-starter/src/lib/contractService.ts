/**
 * ContractService - Servicio para interactuar con el smart contract SupplyChain
 * 
 * Responsabilidades:
 * - Conectar con el contrato desplegado usando ethers.js
 * - Proporcionar métodos para llamar funciones del contrato
 * - Manejar transacciones y lectura de datos
 * - Gestionar eventos del contrato
 * 
 * Uso:
 * const contractService = new ContractService();
 * await contractService.requestUserRole(1); // 1 = Producer
 */

import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '@/contracts/config';
import { RequestHistoryService } from './requestHistoryService';

export class ContractService {
  private provider: ethers.BrowserProvider;
  private contract: ethers.Contract;

  constructor() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask no encontrado. Por favor instala MetaMask para continuar.');
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      CONTRACT_CONFIG.abi,
      this.provider
    );
  }

  /**
   * Obtiene el signer (cuenta conectada) para enviar transacciones
   */
  private async getSigner() {
    return await this.provider.getSigner();
  }

  // ==================== GESTIÓN DE USUARIOS ====================

  /**
   * Solicitar registro con un rol específico
   * @param roleId - Índice del rol:
   *   0 = Admin (bloqueado en el contrato)
   *   1 = Producer
   *   2 = Factory
   *   3 = Retailer
   *   4 = Consumer
   * @returns Promise con el recibo de la transacción
   */
  async requestUserRole(roleId: number) {
    try {
      const signer = await this.getSigner();
      const signerAddress = await signer.getAddress();
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.requestUserRoleById(roleId);
      const receipt = await tx.wait();
      
      // Registrar en el historial para trazabilidad
      RequestHistoryService.addEntry({
        address: signerAddress,
        action: 'requested',
        roleId: roleId,
      });
      
      return receipt;
    } catch (error: any) {
      // Detectar si el usuario canceló la transacción
      if (error?.code === 4001 || 
          error?.code === 'ACTION_REJECTED' ||
          error?.message?.includes('User denied') ||
          error?.message?.includes('user rejected')) {
        // Re-lanzar el error sin loguearlo (se manejará en page.tsx)
        throw error;
      }
      // Para otros errores, sí loguear
      console.error('Error al solicitar rol:', error);
      throw error;
    }
  }

  /**
   * Obtener información de un usuario desde el contrato
   * @param address - Dirección del usuario
   * @returns Objeto con información del usuario
   */
  async getUserInfo(address: string) {
    try {
      const user = await this.contract.getUserInfo(address);
      return {
        id: Number(user.id),
        userAddress: user.userAddress,
        role: Number(user.rol), // 0=Admin, 1=Producer, 2=Factory, 3=Retailer, 4=Consumer
        status: Number(user.status), // 0=Pending, 1=Approved, 2=Rejected, 3=Canceled
      };
    } catch (error: any) {
      // No loguear si es un error esperado (usuario no registrado)
      if (!error?.message?.includes('UserDoesNotExist') && 
          !error?.message?.includes('missing revert data') &&
          error?.code !== 'CALL_EXCEPTION') {
        console.error('Error al obtener info de usuario:', error);
      }
      throw error;
    }
  }

  /**
   * Obtener el rol y estado de aprobación de un usuario
   * @param address - Dirección del usuario
   * @returns Objeto con roleId e isApproved
   */
  async getUser(address: string): Promise<{ roleId: number; isApproved: boolean }> {
    try {
      const userInfo = await this.getUserInfo(address);
      return {
        roleId: userInfo.role,
        isApproved: userInfo.status === 1, // 1 = Approved
      };
    } catch (error: any) {
      // Silenciar error si el usuario simplemente no existe (es esperado)
      if (error?.message?.includes('UserDoesNotExist') || 
          error?.message?.includes('missing revert data') ||
          error?.code === 'CALL_EXCEPTION') {
        console.log('ℹ️ Usuario no registrado:', address);
      } else {
        console.error('Error al obtener usuario:', error);
      }
      // Si el usuario no existe o hay error, retornar valores por defecto
      return { roleId: 0, isApproved: false };
    }
  }

  /**
   * Aprobar un usuario (solo admin)
   * @param address - Dirección del usuario a aprobar
   * @returns Promise con el recibo de la transacción
   */
  async approveUser(address: string) {
    try {
      const signer = await this.getSigner();
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.approveUser(address);
      const receipt = await tx.wait();
      
      // El historial se registrará automáticamente via evento UserStatusChanged
      return receipt;
    } catch (error: any) {
      // No loguear si el usuario canceló la transacción
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('rejected')
      ) {
        // Usuario canceló, solo re-lanzar sin loguear
        throw error;
      }
      
      // Para otros errores, sí loguear
      console.error('Error al aprobar usuario:', error);
      throw error;
    }
  }

  /**
   * Rechazar un usuario (solo admin)
   * @param address - Dirección del usuario a rechazar
   * @returns Promise con el recibo de la transacción
   */
  async rejectUser(address: string) {
    try {
      const signer = await this.getSigner();
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.rejectUser(address);
      const receipt = await tx.wait();
      
      // El historial se registrará automáticamente via evento UserStatusChanged
      return receipt;
    } catch (error: any) {
      // No loguear si el usuario canceló la transacción
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('rejected')
      ) {
        // Usuario canceló, solo re-lanzar sin loguear
        throw error;
      }
      
      // Para otros errores, sí loguear
      console.error('Error al rechazar usuario:', error);
      throw error;
    }
  }

  /**
   * Cancelar la propia cuenta del usuario (solo si está en estado Pending)
   * @returns Promise con el recibo de la transacción
   */
  async cancelMyAccount() {
    try {
      const signer = await this.getSigner();
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.cancelMyAccount();
      const receipt = await tx.wait();
      
      console.log('Cuenta cancelada exitosamente');
      return receipt;
    } catch (error) {
      console.error('Error al cancelar cuenta:', error);
      throw error;
    }
  }

  /**
   * Obtener la dirección del admin del contrato
   * @returns Dirección del admin
   */
  async getAdmin(): Promise<string> {
    try {
      return await this.contract.admin();
    } catch (error) {
      console.error('Error al obtener admin:', error);
      throw error;
    }
  }

  /**
   * Verificar si una dirección es admin
   * @param address - Dirección a verificar
   * @returns true si es admin, false en caso contrario
   */
  async isAdmin(address: string): Promise<boolean> {
    try {
      return await this.contract.isAdmin(address);
    } catch (error) {
      console.error('Error al verificar admin:', error);
      return false;
    }
  }

  /**
   * Obtener la dirección del owner/admin del contrato
   * @returns Dirección del owner
   */
  async getOwner(): Promise<string> {
    try {
      return await this.contract.owner();
    } catch (error) {
      console.error('Error al obtener owner:', error);
      throw error;
    }
  }

  // ==================== EVENTOS DEL CONTRATO ====================

  /**
   * Escuchar evento de registro de usuario
   * @param callback - Función que se ejecuta cuando se registra un usuario
   */
  onUserRegistered(callback: (user: string, id: bigint, role: number, status: number) => void) {
    this.contract.on('UserRegistered', callback);
  }

  /**
   * Obtener eventos pasados de UserRegistered desde el bloque 0
   * @returns Array de eventos con los usuarios registrados
   */
  async getPastUserRegisteredEvents() {
    try {
      const filter = this.contract.filters.UserRegistered();
      const events = await this.contract.queryFilter(filter, 0);
      return events.map(event => ({
        user: event.args[0] as string,
        id: event.args[1] as bigint,
        role: Number(event.args[2]),
        status: Number(event.args[3]),
      }));
    } catch (error) {
      console.error('Error al obtener eventos pasados:', error);
      return [];
    }
  }

  /**
   * Escuchar cambios de estado de usuario
   * @param callback - Función que se ejecuta cuando cambia el estado de un usuario
   */
  onUserStatusChanged(callback: (user: string, id: bigint, status: number) => void) {
    this.contract.on('UserStatusChanged', callback);
  }

  /**
   * Escuchar cambios de rol de usuario
   * @param callback - Función que se ejecuta cuando cambia el rol de un usuario
   */
  onUserRoleChanged(callback: (user: string, id: bigint, role: number) => void) {
    this.contract.on('UserRoleChanged', callback);
  }

  /**
   * Remover todos los listeners de eventos
   * Importante llamar esto cuando el componente se desmonte
   */
  removeAllListeners() {
    this.contract.removeAllListeners();
  }

  /**
   * Obtener la dirección del contrato
   */
  getContractAddress(): string {
    return CONTRACT_CONFIG.address;
  }

  // ==================== GESTIÓN DE TOKENS ====================

  /**
   * Crear un nuevo token
   * @param name - Nombre del token
   * @param totalSupply - Cantidad total de tokens
   * @param features - Metadatos en formato JSON
   * @param parentId - ID del token padre (0 para tokens raíz)
   * @returns Promise con el recibo de la transacción
   */
  async createToken(
    name: string,
    totalSupply: number,
    features: string,
    parentId: number = 0
  ) {
    try {
      const signer = await this.getSigner();
      const contractWithSigner = this.contract.connect(signer);
      
      console.log('Creando token:', { name, totalSupply, features, parentId });
      
      const tx = await contractWithSigner.createToken(
        name,
        totalSupply,
        features,
        parentId
      );
      
      const receipt = await tx.wait();
      console.log('Token creado exitosamente:', receipt);
      
      return receipt;
    } catch (error: any) {
      console.error('Error al crear token:', error);
      
      // Detectar errores específicos del contrato
      if (error?.message?.includes('ZeroSupply')) {
        throw new Error('La cantidad total debe ser mayor a 0');
      }
      if (error?.message?.includes('RoleNotAllowedToCreateToken')) {
        throw new Error('Tu rol no tiene permisos para crear tokens');
      }
      if (error?.message?.includes('CreatorNotApproved')) {
        throw new Error('Tu cuenta debe estar aprobada para crear tokens');
      }
      if (error?.message?.includes('InvalidParent')) {
        throw new Error('Token padre inválido para tu rol');
      }
      
      throw error;
    }
  }

  /**
   * Obtener información de un token
   * @param tokenId - ID del token
   * @returns Información del token
   */
  async getToken(tokenId: number) {
    try {
      const token = await this.contract.getToken(tokenId);
      return {
        id: Number(token.id),
        creator: token.creator,
        name: token.name,
        totalSupply: Number(token.totalSupply),
        features: token.features,
        parentId: Number(token.parentId),
        dateCreated: Number(token.dateCreated),
      };
    } catch (error: any) {
      if (error?.message?.includes('TokenDoesNotExist')) {
        throw new Error('El token no existe');
      }
      console.error('Error al obtener token:', error);
      throw error;
    }
  }

  /**
   * Obtener balance de un token para un usuario
   * @param tokenId - ID del token
   * @param userAddress - Dirección del usuario
   * @returns Balance del token
   */
  async getTokenBalance(tokenId: number, userAddress: string): Promise<number> {
    try {
      const balance = await this.contract.getTokenBalance(tokenId, userAddress);
      return Number(balance);
    } catch (error) {
      console.error('Error al obtener balance del token:', error);
      return 0;
    }
  }

  /**
   * Obtener todos los tokens de un usuario
   * @param userAddress - Dirección del usuario
   * @returns Array de IDs de tokens
   */
  async getUserTokens(userAddress: string): Promise<number[]> {
    try {
      const tokenIds = await this.contract.getUserTokens(userAddress);
      return tokenIds.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Error al obtener tokens del usuario:', error);
      return [];
    }
  }

  /**
   * Obtener el siguiente ID de token disponible
   */
  async getNextTokenId(): Promise<number> {
    try {
      const nextId = await this.contract.nextTokenId();
      return Number(nextId);
    } catch (error) {
      console.error('Error al obtener nextTokenId:', error);
      return 0;
    }
  }

  /**
   * Escuchar eventos de creación de tokens
   * @param callback - Función que se ejecuta cuando se crea un token
   */
  onTokenCreated(callback: (
    tokenId: number,
    creator: string,
    name: string,
    totalSupply: number,
    parentId: number,
    features: string
  ) => void) {
    this.contract.on('TokenCreated', (
      tokenId: bigint,
      creator: string,
      name: string,
      totalSupply: bigint,
      parentId: bigint,
      features: string
    ) => {
      callback(
        Number(tokenId),
        creator,
        name,
        Number(totalSupply),
        Number(parentId),
        features
      );
    });
  }
}
