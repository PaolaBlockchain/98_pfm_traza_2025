'use client';
import { useContext } from 'react';
import { Web3Context } from '@/contexts/Web3Context';

export function useWallet() {
  const context = useContext(Web3Context);
  if (!context) throw new Error('useWallet debe usarse dentro de <Web3Provider>');
  return context;
}
