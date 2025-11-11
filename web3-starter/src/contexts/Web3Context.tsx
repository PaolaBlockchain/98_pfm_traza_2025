'use client';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Web3Service } from '@/lib/web3';
import { NETWORK_CONFIG, CONTRACT_CONFIG } from '@/contracts/config';

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
      setAccount(wallet);
      if (wallet && wallet.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase()) {
        setRole('admin');
        setStatus('approved');
      } else {
        // Verificar si existe una solicitud pendiente en localStorage
        if (typeof window !== 'undefined') {
          const pendingRequests = localStorage.getItem('pendingUserRequests');
          if (pendingRequests) {
            try {
              const requests = JSON.parse(pendingRequests);
              const userRequest = requests.find((r: { address: string; role: string; status: RegistrationStatus }) => r.address.toLowerCase() === wallet.toLowerCase());
              if (userRequest) {
                // Si el estado es canceled, no restaurar el rol
                if (userRequest.status === 'canceled') {
                  setRole('');
                  setStatus('unregistered');
                } else {
                  setRole(userRequest.role);
                  setStatus(userRequest.status);
                }
              } else {
                setRole('');
                setStatus('unregistered');
              }
            } catch {
              setRole('');
              setStatus('unregistered');
            }
          } else {
            setRole('');
            setStatus('unregistered');
          }
        }
      }
      setManuallyDisconnected(false);
      setChainId(NETWORK_CONFIG.chainId);
    } catch (err: unknown) {
      console.error('Connection failed:', err);
      setError(err instanceof Error ? err.message : String(err));
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

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!account || !accounts.length) return;

      const newAccount = accounts[0];
      if (newAccount !== account) {
        setAccount(newAccount);
        setRole('');
        setStatus('unregistered');
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
