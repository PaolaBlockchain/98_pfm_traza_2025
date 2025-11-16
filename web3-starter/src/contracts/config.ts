import SupplyChainABI from './SupplyChain.json';

export const NETWORK_CONFIG = {
  chainId: 31337,
  chainIdHex: '0x7a69',
  chainName: 'Anvil Local',
  rpcUrls: ['http://localhost:8545'],
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};

export const CONTRACT_CONFIG = {
  // Dirección del contrato desplegado en Anvil
  address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: SupplyChainABI as any, // Cast necesario para compatibilidad con ethers.js
};
