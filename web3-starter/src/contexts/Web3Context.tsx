'use client';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Web3Service } from '@/lib/web3';
import { NETWORK_CONFIG } from '@/contracts/config';
import { ContractService } from '@/lib/contractService';

export type RegistrationStatus = 'unregistered' | 'pending' | 'approved' | 'rejected' | 'canceled';

const STORAGE_KEYS = {
  account: 'walletAccount',
  status: 'registrationStatus',
  role: 'userRole',
} as const;

const ALLOWED_STATUS = new Set<RegistrationStatus>([
  'unregistered',
  'pending',
  'approved',
  'rejected',
  'canceled',
]);

type Web3ContextShape = {
  account: string | null;
  status: RegistrationStatus;
  role: string;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  setRole: (role: string) => void;
  setStatus: (status: RegistrationStatus) => void;
  resetAll: () => void;
};

export const Web3Context = createContext<Web3ContextShape | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>('unregistered');
  const [role, setRole] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);

  const parseStoredStatus = (value: string | null): RegistrationStatus => {
    if (!value) return 'unregistered';
    const candidate = value as RegistrationStatus;
    return ALLOWED_STATUS.has(candidate) ? candidate : 'unregistered';
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedAccount = window.localStorage.getItem(STORAGE_KEYS.account);
    const savedRole = window.localStorage.getItem(STORAGE_KEYS.role) || '';
    const savedStatus = parseStoredStatus(window.localStorage.getItem(STORAGE_KEYS.status));

    // Si no hay cuenta almacenada, resetear todo el estado
    if (!savedAccount) {
      setAccount(null);
      setStatus('unregistered');
      setRole('');
      return;
    }

    if (savedAccount) setAccount(savedAccount);
    setRole(savedRole);
    setStatus(savedStatus);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (account) window.localStorage.setItem(STORAGE_KEYS.account, account);
    else window.localStorage.removeItem(STORAGE_KEYS.account);
  }, [account]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.status, status);
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (role) window.localStorage.setItem(STORAGE_KEYS.role, role);
    else window.localStorage.removeItem(STORAGE_KEYS.role);
  }, [role]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setConnecting(true);
      const wallet = await Web3Service.connectWallet();
      console.log('🔍 Cuenta conectada desde MetaMask:', wallet);
      setAccount(wallet);
      
      // Consultar el rol del usuario directamente del contrato
      try {
        const contractService = new ContractService();
        
        // Primero verificar si es admin consultando la dirección del admin del contrato
        let isAdmin = false;
        try {
          const adminAddress = await contractService.getAdmin();
          isAdmin = wallet.toLowerCase() === adminAddress.toLowerCase();
          console.log('👑 Verificando admin - wallet:', wallet, ', admin del contrato:', adminAddress, ', ¿es admin?:', isAdmin);
        } catch (adminError) {
          console.error('Error al obtener admin del contrato:', adminError);
        }
        
        if (isAdmin) {
          setRole('ADMIN');
          setStatus('approved');
          console.log('✅ Usuario conectado como ADMIN');
        } else {
          // Para usuarios no-admin, consultar su información del contrato
          const userInfo = await contractService.getUserInfo(wallet);
          console.log('📋 Info completa del usuario desde el contrato:', userInfo);
          
          // Mapeo de roleId a nombre de rol
          const roleMap: Record<number, string> = {
            0: 'ADMIN', // Admin role
            1: 'PRODUCER',
            2: 'FACTORY',
            3: 'RETAILER',
            4: 'CONSUMER',
          };
          
          // Mapeo de estados del contrato (enum UserStatus en Solidity)
          // 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Canceled
          const statusMap: Record<number, RegistrationStatus> = {
            0: 'pending',
            1: 'approved',
            2: 'rejected',
            3: 'canceled',
          };
          
          // Usar el rol y estado real del contrato
          const contractRole = roleMap[userInfo.role] || '';
          const contractStatus = statusMap[userInfo.status] || 'unregistered';
          
          console.log('✅ Rol del contrato:', contractRole, '(roleId:', userInfo.role, ')');
          console.log('✅ Estado del contrato:', contractStatus, '(statusId:', userInfo.status, ')');
          
          setRole(contractRole);
          setStatus(contractStatus);
        }
      } catch (error: any) {
        // Silenciar errores esperados (usuario no registrado)
        if (error?.message?.includes('UserDoesNotExist') || 
            error?.message?.includes('missing revert data') ||
            error?.message?.includes('0x907b361f') || // Custom error UserDoesNotExist
            error?.code === 'CALL_EXCEPTION') {
          console.log('ℹ️ Usuario no registrado en el contrato, mostrando pantalla de registro');
          // Si falla la consulta, asumir no registrado
          setRole('');
          setStatus('unregistered');
        } else {
          console.error('Error inesperado al consultar rol del contrato:', error);
          // Para errores no esperados, también asumir no registrado
          setRole('');
          setStatus('unregistered');
        }
      }
      
      setManuallyDisconnected(false);
      setChainId(NETWORK_CONFIG.chainId);
    } catch (err: any) {
      // Detectar PRIMERO si el usuario canceló la conexión en MetaMask
      if (err?.code === 4001 || 
          err?.message === 'USER_REJECTED' ||
          err?.message?.includes('User rejected') || 
          err?.message?.includes('user rejected') ||
          err?.message?.includes('User denied') ||
          err?.message?.includes('canceled') ||
          err?.message?.includes('cancelled')) {
        console.log('Usuario canceló la conexión en MetaMask');
        setError(null); // No mostrar error si el usuario canceló
      } else {
        // Solo loguear si NO es una cancelación
        console.error('Connection failed:', err);
        // Para otros errores, guardar el mensaje
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setManuallyDisconnected(true);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.account);
    }
  }, []);

  const resetAll = useCallback(() => {
    setAccount(null);
    setRole('');
    setStatus('unregistered');
    setChainId(null);
    setError(null);

    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  }, []);

  useEffect(() => {
    const eth = Web3Service.getEthereum();
    if (!eth) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!accounts.length) {
        // Si no hay cuentas, desconectar
        setAccount(null);
        setRole('');
        setStatus('unregistered');
        return;
      }

      const newAccount = accounts[0];
      if (newAccount !== account) {
        const previousAccount = account;
        setAccount(newAccount);
        
        // Consultar el rol del nuevo usuario desde el contrato
        let newRole = '';
        let newStatus: RegistrationStatus = 'unregistered';
        
        try {
          const contractService = new ContractService();
          
          const roleMap: Record<number, string> = {
            0: '',
            1: 'PRODUCER',
            2: 'FACTORY',
            3: 'RETAILER',
            4: 'CONSUMER',
          };
          
          // Mapeo de estados del contrato
          const statusMap: Record<number, RegistrationStatus> = {
            0: 'pending',
            1: 'approved',
            2: 'rejected',
            3: 'canceled',
          };
          
          const ADMIN_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
          const isAdmin = newAccount.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
          
          if (isAdmin) {
            newRole = 'ADMIN';
            newStatus = 'approved';
          } else {
            // Usar getUserInfo en lugar de getUser
            const userInfo = await contractService.getUserInfo(newAccount);
            newRole = roleMap[userInfo.role] || '';
            newStatus = statusMap[userInfo.status] || 'unregistered';
          }
          
          setRole(newRole);
          setStatus(newStatus);
          
          // Si cambió la cuenta o el rol, redirigir al dashboard para evitar confusión
          // Solo redirigir si había una cuenta anterior (no es la primera conexión)
          if (previousAccount && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            // No redirigir si ya estamos en dashboard, admin/users, o en la página principal
            if (currentPath !== '/dashboard' && 
                currentPath !== '/admin/users' && 
                currentPath !== '/') {
              console.log('🔄 Cuenta o rol cambiado desde MetaMask, redirigiendo al dashboard...');
              // Usar setTimeout para asegurar que el estado se actualice primero
              setTimeout(() => {
                if (newStatus === 'approved' && newRole) {
                  if (newRole === 'ADMIN') {
                    window.location.href = '/admin/users';
                  } else {
                    window.location.href = '/dashboard';
                  }
                } else {
                  window.location.href = '/';
                }
              }, 500);
            }
          }
        } catch (error: any) {
          // Silenciar errores esperados (usuario no registrado)
          if (error?.message?.includes('UserDoesNotExist') || 
              error?.message?.includes('missing revert data') ||
              error?.code === 'CALL_EXCEPTION') {
            console.log('ℹ️ Usuario no registrado, mostrando pantalla de registro');
          } else {
            console.error('Error al consultar rol del nuevo usuario:', error);
          }
          setRole('');
          setStatus('unregistered');
          
          // Si cambió la cuenta y el usuario no está registrado, redirigir a la página principal
          if (previousAccount && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            if (currentPath !== '/') {
              setTimeout(() => {
                window.location.href = '/';
              }, 500);
            }
          }
        }
        
        setManuallyDisconnected(false);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const hexId = args[0] as string;
      const id = parseInt(hexId, 16);
      setChainId(id);
      if (id !== NETWORK_CONFIG.chainId) {
        Web3Service.ensureChain().catch(() => {});
      }
    };

    eth.on?.('accountsChanged', handleAccountsChanged);
    eth.on?.('chainChanged', handleChainChanged);

    (async () => {
      // No auto-conectar cuentas existentes, solo verificar chainId
      try {
        const chainHex = await eth.request({ method: 'eth_chainId' });
  setChainId(parseInt(chainHex as string, 16));
      } catch {
        setChainId(null);
      }
    })();

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [account, disconnect, manuallyDisconnected]);

  const value = useMemo(
    () => ({
      account,
      status,
      role,
      chainId,
      connecting,
      error,
      connect,
      disconnect,
      setRole,
      setStatus,
      resetAll,
    }),
    [account, status, role, chainId, connecting, error, connect, disconnect, resetAll]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
