// lib/web3.ts
import { NETWORK_CONFIG } from '../contracts/config';

type Ethereum = {
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

function getEthereum(): Ethereum | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).ethereum as Ethereum | undefined;
}

export const Web3Service = {
  getEthereum,

  async ensureChain(): Promise<boolean> {
    const eth = getEthereum();
    if (!eth) return false;
    const current = await eth.request({ method: 'eth_chainId' });
    if (current === NETWORK_CONFIG.chainIdHex) return true;
    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [NETWORK_CONFIG],
      });
      return true;
    } catch {
      return false;
    }
  },

  async connectWallet(): Promise<string> {
    const eth = getEthereum();
    if (!eth) throw new Error('MetaMask no encontrado');
    const ok = await this.ensureChain();
    if (!ok) throw new Error('Agrega/Cambia a Anvil Local (31337) en MetaMask');
    const accs = await eth.request({ method: 'eth_requestAccounts' });
    if (!accs?.length) throw new Error('No se recibieron cuentas');
    return accs[0];
  },

  async getAccounts(): Promise<string[]> {
    const eth = getEthereum();
    if (!eth) return [];
    return eth.request({ method: 'eth_accounts' });
  },
};
