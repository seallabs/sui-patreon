/**
 * Sui Platform Constants
 */

import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

// Contract Configuration
export const PACKAGE_ID =
  '0xcac1eabc44bc10496c5adb8892fd20f242e7e1b08974c097fc6020590d976990';

export const PROFILE_REGISTRY =
  '0xd02a58df3d27e47de49c06fde47156b6306eb4846e9b49ac30503db0b1a0a3f9';

export const TIER_REGISTRY =
  '0x8ca897415986fca16690214cc530ccb4f595f57cafb238d27d5d8832136aec45';

export const CONTENT_REGISTRY =
  '0x15fa8c2e8dad5f9751eb7abdbfcecf9d5d50097d4e4e49f68e979413340a9f56';

// System Objects
export { SUI_CLOCK_OBJECT_ID };

// WALRUS Configuration
export const WALRUS_TYPE =
  '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';

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
