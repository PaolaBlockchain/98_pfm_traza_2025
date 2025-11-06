'use client';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Web3Service } from '../lib/web3';
import { NETWORK_CONFIG } from '../contracts/config';

// Tipos posibles del estado de registro
export type RegistrationStatus = 'unregistered' | 'pending' | 'approved';

// Claves para localStorage
const LS = {
  account: 'walletAccount',
  status: 'registrationStatus',
  role: 'userRole',
};

// Tipado del contexto
type Ctx = {
  account: string | null;
  status: RegistrationStatus;
  role: string;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  setRole: (r: string) => void;
  setStatus: (s: RegistrationStatus) => void;
};

// Creación del contexto
export const Web3Context = createContext<Ctx | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // 🔹 Estados iniciales SIN acceder a localStorage directamente
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>('unregistered');
  const [role, setRole] = useState<string>('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Restaurar sesión desde localStorage (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined') return; // evita SSR crash

    const savedAccount = localStorage.getItem(LS.account);
    const savedStatus = (localStorage.getItem(LS.status) as RegistrationStatus) || 'unregistered';
    const savedRole = localStorage.getItem(LS.role) || '';

    if (savedAccount) setAccount(savedAccount);
    setStatus(savedStatus);
    setRole(savedRole);
  }, []);

  // ✅ Guardar persistencia en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (account) localStorage.setItem(LS.account, account);
    else localStorage.removeItem(LS.account);
  }, [account]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LS.status, status);
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (role) localStorage.setItem(LS.role, role);
    else localStorage.removeItem(LS.role);
  }, [role]);

  // 🔹 Conectar MetaMask
  const connect = useCallback(async () => {
    try {
      setError(null);
      setConnecting(true);
      const acc = await Web3Service.connectWallet();
      setAccount(acc);
      setStatus('unregistered');
      setChainId(NETWORK_CONFIG.chainId);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  // 🔹 Desconectar MetaMask y limpiar datos
  const disconnect = useCallback(() => {
    setAccount(null);
    setRole('');
    setStatus('unregistered');
    setChainId(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS.account);
      localStorage.removeItem(LS.status);
      localStorage.removeItem(LS.role);
    }
  }, []);

  // 🔹 Detectar cambios en MetaMask (cuenta / red)
  useEffect(() => {
    const eth = Web3Service.getEthereum();
    if (!eth) return;

    const onAccountsChanged = (accs: string[]) => {
      if (!accs?.length) return disconnect();
      setAccount(accs[0]);
      setStatus('unregistered');
      setRole('');
    };

    const onChainChanged = (idHex: string) => {
      const id = parseInt(idHex, 16);
      setChainId(id);
      if (id !== NETWORK_CONFIG.chainId) Web3Service.ensureChain().catch(() => {});
    };

    eth.on?.('accountsChanged', onAccountsChanged);
    eth.on?.('chainChanged', onChainChanged);

    // 🔹 Restaurar chainId + cuentas actuales
    (async () => {
      const accs = await Web3Service.getAccounts();
      if (accs.length && !account) setAccount(accs[0]);
      try {
        const idHex = await eth.request({ method: 'eth_chainId' });
        setChainId(parseInt(idHex, 16));
      } catch {}
    })();

    return () => {
      eth.removeListener?.('accountsChanged', onAccountsChanged);
      eth.removeListener?.('chainChanged', onChainChanged);
    };
  }, [disconnect, account]);

  // 🔹 Valor compartido en el contexto
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
    }),
    [account, status, role, chainId, connecting, error, connect, disconnect]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}