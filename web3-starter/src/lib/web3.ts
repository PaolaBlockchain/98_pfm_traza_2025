import { NETWORK_CONFIG } from '@/contracts/config';

type EthereumProvider = {
  request: (input: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  const candidate = window as Window & { ethereum?: EthereumProvider };
  return candidate.ethereum;
}

export const Web3Service = {
  getEthereum,

  async ensureChain(): Promise<boolean> {
    const eth = getEthereum();
    if (!eth) return false;
  const current = (await eth.request({ method: 'eth_chainId' })) as string;
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
    if (!eth) throw new Error('MetaMask no encontrado. Por favor instala MetaMask para continuar.');
    
    const ok = await this.ensureChain();
    if (!ok) throw new Error('Agrega o cambia a Anvil Local (31337) en MetaMask');

    // Solicitar permisos explícitamente para forzar a MetaMask a abrir el selector de cuentas
    try {
      await eth.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (error: any) {
      // Si el usuario cancela (código 4001), lanzar error específico
      if (error?.code === 4001 || error?.message?.includes('User rejected')) {
        const rejectionError = new Error('USER_REJECTED');
        (rejectionError as any).code = 4001;
        throw rejectionError;
      }
      // Para otros errores, re-lanzar
      throw error;
    }

    // Ahora solicitar las cuentas - esto debería usar los permisos recién otorgados
    const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
    if (!accounts?.length) throw new Error('No se recibieron cuentas');
    return accounts[0];
  },

  async getAccounts(): Promise<string[]> {
    const eth = getEthereum();
    if (!eth) return [];
    return (await eth.request({ method: 'eth_accounts' })) as string[];
  },
};
