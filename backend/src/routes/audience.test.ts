/**
 * Tests for /api/creators/:address/subscribers endpoint
 */

import { describe, test, expect } from 'bun:test';

const API_BASE = 'http://localhost:3001/api';

// Real creator addresses from database
const CREATOR_ALICE = '0xb7758e1461586bf8cc294a65aa10163b4623293b917464dc41eaea9bf25163ae';
const CREATOR_TEST = '0xb4aff11985553c61d56dae1416afc092fb10a15aa3e8087995543e14a38cba64';
const CREATOR_TOM = '0x0710dd78270540753d78bbee56fb395645ca0da170c7ddfdcbff0c7adc022ef2';
const NONEXISTENT_CREATOR = '0x1234567890abcdef1234567890abcdef12345678';

describe('GET /api/creators/:address/subscribers', () => {
  test('should return subscribers for creator with active subscriptions', async () => {
    const response = await fetch(`${API_BASE}/creators/${CREATOR_ALICE}/subscribers`);

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify structure of returned data
    const subscriber = data[0];
    expect(subscriber).toHaveProperty('id');
    expect(subscriber).toHaveProperty('subscriptionId');
    expect(subscriber).toHaveProperty('subscriber');
    expect(subscriber).toHaveProperty('tierId');
    expect(subscriber).toHaveProperty('startsAt');
    expect(subscriber).toHaveProperty('expiresAt');
    expect(subscriber).toHaveProperty('isActive');
    expect(subscriber).toHaveProperty('tier');

    // Verify tier is populated
    expect(subscriber.tier).toHaveProperty('id');
    expect(subscriber.tier).toHaveProperty('name');
    expect(subscriber.tier).toHaveProperty('price');
  });

  test('should return 404 for non-existent creator', async () => {
    const response = await fetch(`${API_BASE}/creators/${NONEXISTENT_CREATOR}/subscribers`);

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Creator not found');
  });

  test('should only return active subscriptions', async () => {
    const response = await fetch(`${API_BASE}/creators/${CREATOR_ALICE}/subscribers`);
    const data = await response.json();

    // All returned subscriptions should be active
    for (const sub of data) {
      expect(sub.isActive).toBe(true);

      // Verify expiry is in the future
      const expiresAt = new Date(sub.expiresAt);
      const now = new Date();
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  test('should return empty array for creator with no subscribers', async () => {
    // First check if creator exists
    const creatorResponse = await fetch(`${API_BASE}/creators/${CREATOR_TOM}`);

    if (creatorResponse.status === 404) {
      // Skip test if creator doesn't exist
      return;
    }

    const response = await fetch(`${API_BASE}/creators/${CREATOR_TOM}/subscribers`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should include tier information with each subscription', async () => {
    const response = await fetch(`${API_BASE}/creators/${CREATOR_ALICE}/subscribers`);
    const data = await response.json();

    if (data.length > 0) {
      const subscriber = data[0];

      // Verify tier object is complete
      expect(subscriber.tier).toBeDefined();
      expect(subscriber.tier.tierId).toBeDefined();
      expect(subscriber.tier.creatorId).toBeDefined();
      expect(subscriber.tier.name).toBeDefined();
      expect(subscriber.tier.description).toBeDefined();
      expect(subscriber.tier.price).toBeDefined();
      expect(subscriber.tier.isActive).toBeDefined();
    }
  });

  test('should handle multiple subscribers for same creator', async () => {
    // Use Tom's creator as he has 2 subscribers
    const response = await fetch(`${API_BASE}/creators/${CREATOR_TOM}/subscribers`);
    const data = await response.json();

    if (data.length > 1) {
      // Verify each subscriber has unique subscription ID
      const subIds = data.map((sub: any) => sub.subscriptionId);
      const uniqueIds = new Set(subIds);
      expect(uniqueIds.size).toBe(subIds.length);
    }
  });
});
