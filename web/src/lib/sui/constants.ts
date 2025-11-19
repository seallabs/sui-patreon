/**
 * Sui Platform Constants
 */

import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

// Contract Configuration
export const PACKAGE_ID =
  '0x40165ac9dd86da55bbd83465cfcae268a021f58e8cd5e54c7fcaad1161859f01';

export const PROFILE_REGISTRY =
  '0xeb507cc11d5a60e778fcf40ab888b2e94b51708854e3ec3aebffa54d339185bd';

export const TIER_REGISTRY =
  '0xfc002c817679f33b0de430dda84149d5f9e1c7f1afc470069dcc4de18306e3e3';

export const CONTENT_REGISTRY =
  '0x7f94954a4bb44c733e5550af143a04bf77d5b0b0a168de210271cb296f6c70e5';

// System Objects
export { SUI_CLOCK_OBJECT_ID };

// USDC Configuration (Testnet)
export const USDC_TYPE =
  '0x952d02f492d8a48393294a25055efb8bb965e04fd012634f33e533b41801fc8c::usdc::USDC';
export const USDC_DECIMALS = 6;

/**
 * Convert USDC amount to smallest unit (6 decimals)
 * @param amount - Amount in USDC (e.g., 5 for 5 USDC)
 * @returns Amount in smallest unit (e.g., 5000000)
 */
export function usdcToSmallestUnit(amount: number): bigint {
  return BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
}

/**
 * Convert smallest unit to USDC amount
 * @param amount - Amount in smallest unit (e.g., 5000000)
 * @returns Amount in USDC (e.g., 5)
 */
export function smallestUnitToUsdc(amount: bigint): number {
  return Number(amount) / 10 ** USDC_DECIMALS;
}
