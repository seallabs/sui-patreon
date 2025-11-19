import { describe, it, expect, beforeAll } from 'bun:test';
import { formatBalance, parseAmount } from './wallet';

describe('Wallet Utilities', () => {
  describe('formatBalance', () => {
    it('should format SUI balance correctly (9 decimals)', () => {
      const balance = 10_500_000_000n; // 10.5 SUI
      const formatted = formatBalance(balance, 9);
      expect(formatted).toBe('10.500000000');
    });

    it('should format USDC balance correctly (6 decimals)', () => {
      const balance = 5_000_000n; // 5 USDC
      const formatted = formatBalance(balance, 6);
      expect(formatted).toBe('5.000000');
    });

    it('should format zero balance', () => {
      const balance = 0n;
      const formatted = formatBalance(balance, 6);
      expect(formatted).toBe('0.000000');
    });

    it('should format fractional amounts', () => {
      const balance = 123_456n; // 0.123456 USDC
      const formatted = formatBalance(balance, 6);
      expect(formatted).toBe('0.123456');
    });

    it('should handle large amounts', () => {
      const balance = 1_000_000_000_000n; // 1,000,000 USDC
      const formatted = formatBalance(balance, 6);
      expect(formatted).toBe('1000000.000000');
    });

    it('should work with string input', () => {
      const balance = '5000000';
      const formatted = formatBalance(balance, 6);
      expect(formatted).toBe('5.000000');
    });
  });

  describe('parseAmount', () => {
    it('should parse whole USDC amounts (6 decimals)', () => {
      const amount = parseAmount('5', 6);
      expect(amount).toBe(5_000_000n);
    });

    it('should parse fractional USDC amounts', () => {
      const amount = parseAmount('5.5', 6);
      expect(amount).toBe(5_500_000n);
    });

    it('should parse SUI amounts (9 decimals)', () => {
      const amount = parseAmount('10.5', 9);
      expect(amount).toBe(10_500_000_000n);
    });

    it('should handle zero', () => {
      const amount = parseAmount('0', 6);
      expect(amount).toBe(0n);
    });

    it('should handle amounts with many decimal places', () => {
      const amount = parseAmount('1.123456', 6);
      expect(amount).toBe(1_123_456n);
    });

    it('should truncate excess decimal places', () => {
      const amount = parseAmount('1.123456789', 6);
      expect(amount).toBe(1_123_456n); // Truncates to 6 decimals
    });

    it('should pad missing decimal places', () => {
      const amount = parseAmount('1.1', 6);
      expect(amount).toBe(1_100_000n); // Pads with zeros
    });

    it('should handle amounts without whole part', () => {
      const amount = parseAmount('.5', 6);
      expect(amount).toBe(500_000n);
    });

    it('should handle amounts without decimal part', () => {
      const amount = parseAmount('5.', 6);
      expect(amount).toBe(5_000_000n);
    });
  });

  describe('formatBalance and parseAmount round-trip', () => {
    it('should maintain value through format and parse cycle', () => {
      const original = 5_500_000n; // 5.5 USDC

      const formatted = formatBalance(original, 6);
      const parsed = parseAmount(formatted, 6);

      expect(parsed).toBe(original);
    });

    it('should work for SUI amounts', () => {
      const original = 10_500_000_000n; // 10.5 SUI

      const formatted = formatBalance(original, 9);
      const parsed = parseAmount(formatted, 9);

      expect(parsed).toBe(original);
    });

    it('should work for zero', () => {
      const original = 0n;

      const formatted = formatBalance(original, 6);
      const parsed = parseAmount(formatted, 6);

      expect(parsed).toBe(original);
    });
  });
});

/**
 * Integration tests (commented out - require actual network connection)
 *
 * To run these tests:
 * 1. Ensure .env is configured with valid PRIVATE_KEY
 * 2. Ensure wallet has some testnet coins
 * 3. Uncomment the tests below
 * 4. Run: bun test wallet.test.ts
 */

/*
describe('Wallet Integration Tests', () => {
  let testAddress: string;

  beforeAll(async () => {
    const { keypair } = await import('./config');
    testAddress = keypair.toSuiAddress();
  });

  it('should get all coins for address', async () => {
    const { getAllCoins } = await import('./wallet');
    const coins = await getAllCoins(testAddress);

    expect(Array.isArray(coins)).toBe(true);
    // Should have at least SUI
    expect(coins.length).toBeGreaterThan(0);
  });

  it('should get SUI balance', async () => {
    const { getTotalBalance } = await import('./wallet');
    const balance = await getTotalBalance(testAddress, '0x2::sui::SUI');

    expect(typeof balance).toBe('bigint');
    expect(balance).toBeGreaterThan(0n);
  });

  it('should get coin objects by type', async () => {
    const { getCoinsByType } = await import('./wallet');
    const coins = await getCoinsByType(testAddress, '0x2::sui::SUI');

    expect(Array.isArray(coins)).toBe(true);
    expect(coins.length).toBeGreaterThan(0);
    expect(coins[0]).toHaveProperty('objectId');
    expect(coins[0]).toHaveProperty('balance');
  });

  it('should display wallet summary', async () => {
    const { displayWalletSummary } = await import('./wallet');

    // This should not throw
    await displayWalletSummary(testAddress);
  });
});
*/
