export const NETWORK_CONFIG = {
  chainId: 31337,
  chainIdHex: '0x7a69',
  chainName: 'Anvil Local',
  rpcUrls: ['http://localhost:8545'],
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};

export const CONTRACT_CONFIG = {
  address: '0x0000000000000000000000000000000000000000',
  abi: [] as const,
  adminAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
};
