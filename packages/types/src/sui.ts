// Sui blockchain related types

export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export interface WalrusConfig {
  publisherUrl: string;
  aggregatorUrl: string;
}

export interface SuiConfig {
  network: SuiNetwork;
  packageId: string;
  walrus?: WalrusConfig;
}
