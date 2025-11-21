/**
 * Sui Platform Constants
 */

import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

// Contract Configuration
export const PACKAGE_ID =
  '0x3a6954a3f5b87c8f495b985cf2a4d0fd34e13c6365742f6b24a9139e1a239135';

export const PROFILE_REGISTRY =
  '0x97119baf410bdbf7d202063e8d1f5e769e1d6c83bf5e30c4281770416a654ed9';

export const TIER_REGISTRY =
  '0xbac8bbfde15afa15e1e70f350336fd35776450b8a8615015bcddbf406be0111e';

export const CONTENT_REGISTRY =
  '0xc7ff17bf9137768dd76bf5909e5fc1fbde2e53fedc98e5fd7b0d49fe8f6f7aef';

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
