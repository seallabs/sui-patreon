/**
 * Currency Configuration
 *
 * Centralized configuration for payment currency settings.
 * Update these values if switching to a different payment token.
 */

/**
 * Payment currency decimals
 * - SUI/MIST: 9 decimals (1 SUI = 1,000,000,000 MIST)
 * - USDC: 6 decimals (1 USDC = 1,000,000 base units)
 * - USDT: 6 decimals (1 USDT = 1,000,000 base units)
 */
export const CURRENCY_DECIMALS = 6;

/**
 * Divisor for converting from smallest unit to standard unit
 * e.g., USDC base units to USDC dollars
 */
export const CURRENCY_DIVISOR = 10 ** CURRENCY_DECIMALS; // 1_000_000 for USDC

/**
 * Currency name for display and logging
 */
export const CURRENCY_NAME = 'USDC';

/**
 * Convert from smallest unit (e.g., USDC base units) to standard unit (e.g., USDC dollars)
 * @param amount - Amount in smallest unit (BigInt or number)
 * @returns Amount in standard unit as number
 */
export function toStandardUnit(amount: bigint | number): number {
  return Number(amount) / CURRENCY_DIVISOR;
}

/**
 * Convert from smallest unit to standard unit and format as string with decimals
 * @param amount - Amount in smallest unit (BigInt or number)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted amount string
 */
export function formatCurrency(amount: bigint | number, decimals: number = 2): string {
  return toStandardUnit(amount).toFixed(decimals);
}

/**
 * Convert from standard unit to smallest unit
 * @param amount - Amount in standard unit
 * @returns Amount in smallest unit as BigInt
 */
export function toSmallestUnit(amount: number): bigint {
  return BigInt(Math.floor(amount * CURRENCY_DIVISOR));
}
