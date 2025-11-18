// Tests for retry utilities
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  retryWithBackoff,
  DependencyNotFoundError,
  isDependencyNotFoundError,
  sleep,
} from './retry-utils';

describe('Retry Utilities', () => {
  describe('sleep', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(150); // Allow some tolerance
    });
  });

  describe('DependencyNotFoundError', () => {
    it('should create error with correct name and message', () => {
      const error = new DependencyNotFoundError('Test dependency not found');
      expect(error.name).toBe('DependencyNotFoundError');
      expect(error.message).toBe('Test dependency not found');
      expect(error instanceof Error).toBe(true);
    });

    it('should be identified by isDependencyNotFoundError', () => {
      const error = new DependencyNotFoundError('Test');
      expect(isDependencyNotFoundError(error)).toBe(true);
      expect(isDependencyNotFoundError(new Error('Test'))).toBe(false);
      expect(isDependencyNotFoundError('not an error')).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt if no error', async () => {
      let attempts = 0;
      const result = await retryWithBackoff(
        async () => {
          attempts++;
          return 'success';
        },
        () => true,
        { maxRetries: 3 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on retryable errors and eventually succeed', async () => {
      let attempts = 0;
      const result = await retryWithBackoff(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new DependencyNotFoundError('Not ready yet');
          }
          return 'success';
        },
        isDependencyNotFoundError,
        { maxRetries: 5, initialDelayMs: 10, maxDelayMs: 100 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw error if max retries exceeded', async () => {
      let attempts = 0;
      try {
        await retryWithBackoff(
          async () => {
            attempts++;
            throw new DependencyNotFoundError('Always fails');
          },
          isDependencyNotFoundError,
          { maxRetries: 3, initialDelayMs: 10 }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(DependencyNotFoundError);
        expect(attempts).toBe(4); // Initial attempt + 3 retries
      }
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      try {
        await retryWithBackoff(
          async () => {
            attempts++;
            throw new Error('Non-retryable error');
          },
          isDependencyNotFoundError,
          { maxRetries: 3 }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Non-retryable error');
        expect(attempts).toBe(1); // Only initial attempt, no retries
      }
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;
      let lastTime = Date.now();

      try {
        await retryWithBackoff(
          async () => {
            const currentTime = Date.now();
            if (attempts > 0) {
              delays.push(currentTime - lastTime);
            }
            lastTime = currentTime;
            attempts++;
            throw new DependencyNotFoundError('Always fails');
          },
          isDependencyNotFoundError,
          {
            maxRetries: 3,
            initialDelayMs: 50,
            backoffMultiplier: 2,
            maxDelayMs: 500,
          }
        );
      } catch (error) {
        // Expected to fail
      }

      // Check that delays are increasing (exponential backoff)
      expect(delays.length).toBe(3);
      expect(delays[0]).toBeGreaterThanOrEqual(50); // ~50ms
      expect(delays[1]).toBeGreaterThanOrEqual(100); // ~100ms
      expect(delays[2]).toBeGreaterThanOrEqual(200); // ~200ms
    });

    it('should cap delay at maxDelayMs', async () => {
      const delays: number[] = [];
      let attempts = 0;
      let lastTime = Date.now();

      try {
        await retryWithBackoff(
          async () => {
            const currentTime = Date.now();
            if (attempts > 0) {
              delays.push(currentTime - lastTime);
            }
            lastTime = currentTime;
            attempts++;
            throw new DependencyNotFoundError('Always fails');
          },
          isDependencyNotFoundError,
          {
            maxRetries: 5,
            initialDelayMs: 100,
            backoffMultiplier: 2,
            maxDelayMs: 150, // Cap at 150ms
          }
        );
      } catch (error) {
        // Expected to fail
      }

      // All delays should be capped at maxDelayMs
      const maxDelay = Math.max(...delays);
      expect(maxDelay).toBeLessThan(200); // Should not exceed maxDelayMs by much
    });
  });

  describe('Simulated Race Condition Scenarios', () => {
    it('should handle ProfileUpdated arriving before ProfileCreated', async () => {
      let profileCreated = false;
      let attempts = 0;

      const result = await retryWithBackoff(
        async () => {
          attempts++;
          // Simulate ProfileCreated arriving on 2nd attempt
          if (attempts === 2) {
            profileCreated = true;
          }

          if (!profileCreated) {
            throw new DependencyNotFoundError('Profile not found yet');
          }

          return 'Profile updated successfully';
        },
        isDependencyNotFoundError,
        { maxRetries: 5, initialDelayMs: 10 }
      );

      expect(result).toBe('Profile updated successfully');
      expect(attempts).toBe(2);
    });

    it('should handle ContentCreated with missing tier dependencies', async () => {
      const availableTiers = new Set<string>();
      let attempts = 0;

      const result = await retryWithBackoff(
        async () => {
          attempts++;
          // Simulate tiers becoming available gradually
          if (attempts === 2) {
            availableTiers.add('tier1');
          }
          if (attempts === 3) {
            availableTiers.add('tier2');
          }

          const requiredTiers = ['tier1', 'tier2'];
          const missingTiers = requiredTiers.filter((t) => !availableTiers.has(t));

          if (missingTiers.length > 0) {
            throw new DependencyNotFoundError(`Missing tiers: ${missingTiers.join(', ')}`);
          }

          return 'Content created successfully';
        },
        isDependencyNotFoundError,
        { maxRetries: 5, initialDelayMs: 10 }
      );

      expect(result).toBe('Content created successfully');
      expect(attempts).toBe(3);
    });
  });
});
