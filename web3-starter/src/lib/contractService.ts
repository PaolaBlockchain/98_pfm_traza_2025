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

      // Detectar error de transición inválida (usuario ya aprobado o estado inválido)
      if (
        errorMessage.includes('invalidtransition') ||
        errorMessage.includes('invalid transition') ||
        error?.reason?.includes('InvalidTransition') ||
        error?.data?.includes('InvalidTransition')
      ) {
        const invalidTransitionError = new Error('Este usuario ya está aprobado o no puede ser aprobado en este momento');
        (invalidTransitionError as any).code = 'INVALID_TRANSITION';
        throw invalidTransitionError;
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

      // Detectar error de transición inválida (usuario ya rechazado o estado inválido)
      if (
        errorMessage.includes('invalidtransition') ||
        errorMessage.includes('invalid transition') ||
        error?.reason?.includes('InvalidTransition') ||
        error?.data?.includes('InvalidTransition')
      ) {
        const invalidTransitionError = new Error('Este usuario ya está rechazado o no puede ser rechazado en este momento');
        (invalidTransitionError as any).code = 'INVALID_TRANSITION';
        throw invalidTransitionError;
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

  // ==================== GESTIÓN DE TRANSFERENCIAS ====================

  /**
   * Solicitar una transferencia de tokens
   * @param to - Dirección del receptor
   * @param tokenId - ID del token a transferir
   * @param amount - Cantidad a transferir
   * @returns Promise con el recibo de la transacción
   */
  async transfer(to: string, tokenId: number, amount: number) {
    try {
      const signer = await this.getSigner();
      
      console.log('Solicitando transferencia:', { to, tokenId, amount });
      
      // Usar Interface para codificar la función manualmente
      const iface = new ethers.Interface(CONTRACT_CONFIG.abi);
      
      // Verificar que la función existe en el ABI
      let transferFragment;
      try {
        transferFragment = iface.getFunction('transfer');
      } catch (error: any) {
        throw new Error('La función transfer no está disponible en el ABI. Asegúrate de que el contrato esté compilado y el ABI actualizado.');
      }
      
      // Codificar los datos de la función
      const txData = iface.encodeFunctionData('transfer', [to, tokenId, amount]);
      
      // Enviar la transacción directamente
      const tx = await signer.sendTransaction({
        to: CONTRACT_CONFIG.address,
        data: txData,
      });
      
      const receipt = await tx.wait();
      console.log('Transferencia solicitada exitosamente:', receipt);
      
      return receipt;
    } catch (error: any) {
      console.error('Error al solicitar transferencia:', error);
      
      // Detectar errores específicos del contrato
      if (error?.message?.includes('InvalidAddress')) {
        throw new Error('Dirección de destino inválida');
      }
      if (error?.message?.includes('CannotTransferToSelf')) {
        throw new Error('No puedes transferir a ti mismo');
      }
      if (error?.message?.includes('InvalidAmount')) {
        throw new Error('La cantidad debe ser mayor a 0');
      }
      if (error?.message?.includes('TokenDoesNotExist')) {
        throw new Error('El token no existe');
      }
      if (error?.message?.includes('InsufficientBalance')) {
        throw new Error('No tienes suficiente balance de este token');
      }
      if (error?.message?.includes('InvalidRoleTransfer')) {
        throw new Error('El flujo de transferencia no es válido para tu rol');
      }
      if (error?.message?.includes('UserNotApproved')) {
        throw new Error('El usuario receptor no está aprobado');
      }
      
      // Detectar cancelación del usuario
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected')
      ) {
        throw error; // Re-lanzar para que se maneje en el componente
      }
      
      throw error;
    }
  }

  /**
   * Aceptar una transferencia pendiente
   * @param transferId - ID de la transferencia a aceptar
   * @returns Promise con el recibo de la transacción
   */
  async acceptTransfer(transferId: number) {
    try {
      const signer = await this.getSigner();
      const contractWithSigner = this.contract.connect(signer);
      
      console.log('Aceptando transferencia:', transferId);
      
      const tx = await contractWithSigner.acceptTransfer(transferId);
      const receipt = await tx.wait();
      console.log('Transferencia aceptada exitosamente:', receipt);
      
      return receipt;
    } catch (error: any) {
      console.error('Error al aceptar transferencia:', error);
      
      if (error?.message?.includes('TransferDoesNotExist')) {
        throw new Error('La transferencia no existe');
      }
      if (error?.message?.includes('TransferAlreadyProcessed')) {
        throw new Error('La transferencia ya fue procesada');
      }
      if (error?.message?.includes('NotTransferRecipient')) {
        throw new Error('Solo el receptor puede aceptar esta transferencia');
      }
      if (error?.message?.includes('InsufficientBalance')) {
        throw new Error('El emisor ya no tiene suficiente balance');
      }
      
      // Detectar cancelación del usuario
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected')
      ) {
        throw error;
      }
      
      throw error;
    }
  }

  /**
   * Rechazar una transferencia pendiente
   * @param transferId - ID de la transferencia a rechazar
   * @returns Promise con el recibo de la transacción
   */
  async rejectTransfer(transferId: number) {
    try {
      const signer = await this.getSigner();
      const contractWithSigner = this.contract.connect(signer);
      
      console.log('Rechazando transferencia:', transferId);
      
      const tx = await contractWithSigner.rejectTransfer(transferId);
      const receipt = await tx.wait();
      console.log('Transferencia rechazada exitosamente:', receipt);
      
      return receipt;
    } catch (error: any) {
      console.error('Error al rechazar transferencia:', error);
      
      if (error?.message?.includes('TransferDoesNotExist')) {
        throw new Error('La transferencia no existe');
      }
      if (error?.message?.includes('TransferAlreadyProcessed')) {
        throw new Error('La transferencia ya fue procesada');
      }
      if (error?.message?.includes('NotTransferRecipient')) {
        throw new Error('Solo el receptor puede rechazar esta transferencia');
      }
      
      // Detectar cancelación del usuario
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorCode = error?.code;
      if (
        errorCode === 4001 ||
        errorCode === 'ACTION_REJECTED' ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('user rejected')
      ) {
        throw error;
      }
      
      throw error;
    }
  }

  /**
   * Obtener información de una transferencia
   * @param transferId - ID de la transferencia
   * @returns Información de la transferencia
   */
  async getTransfer(transferId: number) {
    try {
      const transfer = await this.contract.getTransfer(transferId);
      return {
        id: Number(transfer.id),
        from: transfer.from,
        to: transfer.to,
        tokenId: Number(transfer.tokenId),
        dateCreated: Number(transfer.dateCreated),
        amount: Number(transfer.amount),
        status: Number(transfer.status), // 0=Pending, 1=Accepted, 2=Rejected
      };
    } catch (error: any) {
      if (error?.message?.includes('TransferDoesNotExist')) {
        throw new Error('La transferencia no existe');
      }
      console.error('Error al obtener transferencia:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las transferencias de un usuario
   * @param userAddress - Dirección del usuario
   * @returns Array de IDs de transferencias
   */
  async getUserTransfers(userAddress: string): Promise<number[]> {
    try {
      const transferIds = await this.contract.getUserTransfers(userAddress);
      return transferIds.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Error al obtener transferencias del usuario:', error);
      return [];
    }
  }

  /**
   * Obtener eventos pasados de TransferRequested
   * @returns Array de eventos de transferencias solicitadas
   */
  async getPastTransferRequestedEvents() {
    try {
      // Intentar usar el filtro del contrato si está disponible
      let filter;
      try {
        if (this.contract.filters && typeof this.contract.filters.TransferRequested === 'function') {
          filter = this.contract.filters.TransferRequested();
        } else {
          // Si el filtro no está disponible, crear el filtro manualmente usando el Interface
          const iface = new ethers.Interface(CONTRACT_CONFIG.abi);
          const eventFragment = iface.getEvent('TransferRequested');
          if (!eventFragment) {
            console.warn('Evento TransferRequested no encontrado en el ABI');
            return [];
          }
          filter = {
            address: CONTRACT_CONFIG.address,
            topics: [iface.getEvent('TransferRequested').topicHash]
          };
        }
      } catch (filterError) {
        // Si falla, intentar crear el filtro manualmente
        const iface = new ethers.Interface(CONTRACT_CONFIG.abi);
        const eventFragment = iface.getEvent('TransferRequested');
        if (!eventFragment) {
          console.warn('Evento TransferRequested no encontrado en el ABI');
          return [];
        }
        filter = {
          address: CONTRACT_CONFIG.address,
          topics: [eventFragment.topicHash]
        };
      }

      const events = await this.contract.queryFilter(filter, 0);
      return events.map(event => ({
        transferId: Number(event.args[0]),
        from: event.args[1] as string,
        to: event.args[2] as string,
        tokenId: Number(event.args[3]),
        amount: Number(event.args[4]),
      }));
    } catch (error) {
      console.error('Error al obtener eventos pasados de transferencias:', error);
      return [];
    }
  }

  /**
   * Escuchar eventos de transferencia solicitada
   * @param callback - Función que se ejecuta cuando se solicita una transferencia
   */
  onTransferRequested(callback: (
    transferId: number,
    from: string,
    to: string,
    tokenId: number,
    amount: number
  ) => void) {
    this.contract.on('TransferRequested', (
      transferId: bigint,
      from: string,
      to: string,
      tokenId: bigint,
      amount: bigint
    ) => {
      callback(
        Number(transferId),
        from,
        to,
        Number(tokenId),
        Number(amount)
      );
    });
  }

  /**
   * Escuchar eventos de transferencia aceptada
   * @param callback - Función que se ejecuta cuando se acepta una transferencia
   */
  onTransferAccepted(callback: (transferId: number) => void) {
    try {
      // Intentar usar el evento directamente si está disponible
      if (this.contract.filters && typeof this.contract.filters.TransferAccepted === 'function') {
        this.contract.on('TransferAccepted', (transferId: bigint) => {
          callback(Number(transferId));
        });
      } else {
        // Si no está disponible, usar el Interface para crear el listener
        const iface = new ethers.Interface(CONTRACT_CONFIG.abi);
        const eventFragment = iface.getEvent('TransferAccepted');
        if (eventFragment) {
          this.contract.on(eventFragment, (transferId: bigint) => {
            callback(Number(transferId));
          });
        } else {
          console.warn('Evento TransferAccepted no encontrado en el ABI');
        }
      }
    } catch (error) {
      console.error('Error al configurar listener de TransferAccepted:', error);
    }
  }

  /**
   * Escuchar eventos de transferencia rechazada
   * @param callback - Función que se ejecuta cuando se rechaza una transferencia
   */
  onTransferRejected(callback: (transferId: number) => void) {
    try {
      // Intentar usar el evento directamente si está disponible
      if (this.contract.filters && typeof this.contract.filters.TransferRejected === 'function') {
        this.contract.on('TransferRejected', (transferId: bigint) => {
          callback(Number(transferId));
        });
      } else {
        // Si no está disponible, usar el Interface para crear el listener
        const iface = new ethers.Interface(CONTRACT_CONFIG.abi);
        const eventFragment = iface.getEvent('TransferRejected');
        if (eventFragment) {
          this.contract.on(eventFragment, (transferId: bigint) => {
            callback(Number(transferId));
          });
        } else {
          console.warn('Evento TransferRejected no encontrado en el ABI');
        }
      }
    } catch (error) {
      console.error('Error al configurar listener de TransferRejected:', error);
    }
  }

  // ==================== TRAZABILIDAD Y ÁRBOL DE TRANSFERENCIAS ====================

  /**
   * Obtener todos los tokens del sistema
   * @returns Array con información de todos los tokens
   */
  async getAllTokens(): Promise<Array<{
    id: number;
    name: string;
    creator: string;
    parentId: number;
    totalSupply: number;
  }>> {
    try {
      const nextTokenId = await this.getNextTokenId();
      const tokens: Array<{
        id: number;
        name: string;
        creator: string;
        parentId: number;
        totalSupply: number;
      }> = [];

      for (let i = 1; i < nextTokenId; i++) {
        try {
          const token = await this.getToken(i);
          tokens.push({
            id: token.id,
            name: token.name,
            creator: token.creator,
            parentId: token.parentId,
            totalSupply: token.totalSupply,
          });
        } catch (error) {
          // Token no existe o error al obtenerlo, continuar
          continue;
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error al obtener todos los tokens:', error);
      return [];
    }
  }

  /**
   * Obtener todas las transferencias de un token específico
   * @param tokenId - ID del token
   * @returns Array de transferencias relacionadas con el token
   */
  async getTokenTransfers(tokenId: number): Promise<Array<{
    id: number;
    from: string;
    to: string;
    amount: number;
    dateCreated: number;
    status: number;
  }>> {
    try {
      const allTransferEvents = await this.getPastTransferRequestedEvents();
      const tokenTransfers = [];

      for (const event of allTransferEvents) {
        if (event.tokenId === tokenId) {
          try {
            const transfer = await this.getTransfer(event.transferId);
            tokenTransfers.push(transfer);
          } catch (error) {
            // Transferencia no existe, continuar
            continue;
          }
        }
      }

      return tokenTransfers.sort((a, b) => a.dateCreated - b.dateCreated);
    } catch (error) {
      console.error('Error al obtener transferencias del token:', error);
      return [];
    }
  }

  /**
   * Obtener tokens hijos (que tienen este token como padre)
   * @param parentId - ID del token padre
   * @returns Array de tokens hijos
   */
  async getChildTokens(parentId: number): Promise<Array<{
    id: number;
    name: string;
    creator: string;
    parentId: number;
    totalSupply: number;
  }>> {
    try {
      const allTokens = await this.getAllTokens();
      return allTokens.filter(token => token.parentId === parentId);
    } catch (error) {
      console.error('Error al obtener tokens hijos:', error);
      return [];
    }
  }

  /**
   * Construir el árbol completo de trazabilidad de un token
   * @param tokenId - ID del token raíz
   * @param visitedDown - Set de IDs visitados hacia abajo (hijos) para evitar ciclos infinitos
   * @param visitedUp - Set de IDs visitados hacia arriba (padres) para evitar ciclos infinitos
   * @returns Árbol de trazabilidad con transferencias y tokens relacionados
   */
  async getTokenTraceabilityTree(
    tokenId: number, 
    visitedDown: Set<number> = new Set(),
    visitedUp: Set<number> = new Set()
  ): Promise<{
    token: {
      id: number;
      name: string;
      creator: string;
      parentId: number;
      totalSupply: number;
      dateCreated: number;
    };
    parent?: {
      token: {
        id: number;
        name: string;
        creator: string;
        parentId: number;
        totalSupply: number;
        dateCreated: number;
      };
      transfers: Array<{
        id: number;
        from: string;
        to: string;
        amount: number;
        dateCreated: number;
        status: number;
      }>;
      children: any[];
      parent?: any;
    };
    transfers: Array<{
      id: number;
      from: string;
      to: string;
      amount: number;
      dateCreated: number;
      status: number;
    }>;
    children: Array<{
      token: {
        id: number;
        name: string;
        creator: string;
        parentId: number;
        totalSupply: number;
        dateCreated: number;
      };
      transfers: Array<{
        id: number;
        from: string;
        to: string;
        amount: number;
        dateCreated: number;
        status: number;
      }>;
      children: any[];
      parent?: any;
    }>;
  }> {
    try {
      // Evitar ciclos infinitos hacia abajo (hijos)
      if (visitedDown.has(tokenId)) {
        throw new Error(`Ciclo detectado hacia abajo en token ${tokenId}`);
      }
      visitedDown.add(tokenId);

      // Evitar ciclos infinitos hacia arriba (padres)
      if (visitedUp.has(tokenId)) {
        throw new Error(`Ciclo detectado hacia arriba en token ${tokenId}`);
      }
      visitedUp.add(tokenId);

      // Obtener información del token
      const token = await this.getToken(tokenId);
      
      // Obtener transferencias de este token
      const transfers = await this.getTokenTransfers(tokenId);

      // Obtener token padre con su propio padre (abuelo) para mostrar la cadena completa de trazabilidad
      // Esto evita ciclos infinitos pero muestra la cadena completa
      let parentTree = null;
      if (token.parentId > 0) {
        try {
          // Verificar si el padre ya está en visitedUp (ciclo hacia arriba)
          if (visitedUp.has(token.parentId)) {
            console.log(`Ciclo hacia arriba detectado: token ${tokenId} tiene padre ${token.parentId} que ya fue visitado`);
            // No cargar el padre si ya está en visitedUp (evitar ciclo)
          } else {
            // Cargar información del padre
            const parentToken = await this.getToken(token.parentId);
            const parentTransfers = await this.getTokenTransfers(token.parentId);
            
            // Cargar el padre del padre (abuelo) si existe, para mostrar la cadena completa
            let grandParentTree = null;
            if (parentToken.parentId > 0 && !visitedUp.has(parentToken.parentId)) {
              try {
                const grandParentToken = await this.getToken(parentToken.parentId);
                const grandParentTransfers = await this.getTokenTransfers(parentToken.parentId);
                
                grandParentTree = {
                  token: {
                    id: grandParentToken.id,
                    name: grandParentToken.name,
                    creator: grandParentToken.creator,
                    parentId: grandParentToken.parentId,
                    totalSupply: grandParentToken.totalSupply,
                    dateCreated: grandParentToken.dateCreated,
                  },
                  transfers: grandParentTransfers,
                  children: [], // No cargamos más niveles para evitar complejidad
                };
              } catch (error) {
                console.log(`No se pudo cargar el abuelo ${parentToken.parentId}:`, error);
              }
            }
            
            // Crear un árbol del padre con su propio padre (abuelo)
            parentTree = {
              token: {
                id: parentToken.id,
                name: parentToken.name,
                creator: parentToken.creator,
                parentId: parentToken.parentId,
                totalSupply: parentToken.totalSupply,
                dateCreated: parentToken.dateCreated,
              },
              parent: grandParentTree || undefined, // Incluir el abuelo si existe
              transfers: parentTransfers,
              children: [], // No cargamos hijos del padre para evitar complejidad
            };
          }
        } catch (error) {
          // Token padre no existe o hay un error, continuar sin padre
          console.log(`No se pudo cargar el árbol del padre ${token.parentId}:`, error);
        }
      }

      // Obtener tokens hijos recursivamente
      // IMPORTANTE: Pasamos visitedDown para evitar ciclos hacia abajo (hijos)
      // NO pasamos visitedUp, permitiendo que los hijos carguen sus padres normalmente
      const children = await this.getChildTokens(tokenId);
      const childrenWithData = await Promise.all(
        children.map(async (child) => {
          // Verificar si el hijo ya está en visitedDown (ciclo hacia abajo)
          if (visitedDown.has(child.id)) {
            console.log(`Ciclo hacia abajo detectado: token ${tokenId} tiene hijo ${child.id} que ya fue visitado`);
            // Retornar un árbol mínimo para el hijo sin cargar recursivamente
            const childToken = await this.getToken(child.id);
            const childTransfers = await this.getTokenTransfers(child.id);
            return {
              token: {
                id: childToken.id,
                name: childToken.name,
                creator: childToken.creator,
                parentId: childToken.parentId,
                totalSupply: childToken.totalSupply,
                dateCreated: childToken.dateCreated,
              },
              transfers: childTransfers,
              children: [],
            };
          } else {
            const newVisitedDown = new Set(visitedDown);
            newVisitedDown.add(tokenId); // Agregar el token actual para evitar ciclos
            const childTree = await this.getTokenTraceabilityTree(child.id, newVisitedDown, new Set());
            return childTree;
          }
        })
      );

      return {
        token: {
          id: token.id,
          name: token.name,
          creator: token.creator,
          parentId: token.parentId,
          totalSupply: token.totalSupply,
          dateCreated: token.dateCreated,
        },
        parent: parentTree || undefined,
        transfers,
        children: childrenWithData,
      };
    } catch (error) {
      console.error('Error al construir árbol de trazabilidad:', error);
      throw error;
    }
  }
}
