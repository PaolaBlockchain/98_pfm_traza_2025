// contracts/config.ts
export const NETWORK_CONFIG = {
  chainId: 31337,
  chainIdHex: '0x7a69',             // 31337 en hex
  chainName: 'Anvil Local',
  rpcUrls: ['http://localhost:8545'],
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};

export const CONTRACT_CONFIG = {
  address: '0x0000000000000000000000000000000000000000', // <- reemplaza cuando despliegues
  abi: [],                                             // <- pega aquí tu ABI cuando lo tengas
  adminAddress: '0x0000000000000000000000000000000000000000',
};