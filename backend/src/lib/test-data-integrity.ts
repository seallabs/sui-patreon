/**
 * Data Integrity and Cascade Test Script
 *
 * Tests unique constraints, required fields, and cascade deletes
 * Run with: bun src/lib/test-data-integrity.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test results tracker
 */
const results = {
  passed: 0,
  failed: 0,
  tests: [] as string[],
};

function logTest(name: string, passed: boolean) {
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
  }
  results.tests.push(`${passed ? '✅' : '❌'} ${name}`);
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Testing Data Integrity...\n');

  // Test 1: Unique constraint on creator address
  console.log('Test 1: Unique constraint enforcement');
  try {
    await prisma.creator.create({
      data: {
        address: '0x0000000000000000000000000000000000000000000000000000000000000001',
        profileId: 'duplicate_test',
        name: 'duplicate_test',
        bio: 'Should fail',
      },
    });
    logTest('Unique address constraint', false);
  } catch (error: any) {
    const isDuplicateError = error.code === 'P2002';
    logTest('Unique address constraint', isDuplicateError);
  }

  // Test 2: Required fields validation
  console.log('\nTest 2: Required fields validation');
  try {
    await prisma.creator.create({
      data: {
        address: '0x9999999999999999999999999999999999999999999999999999999999999999',
        profileId: 'test_profile',
        // Missing required 'name' field
        bio: 'Test bio',
      } as any,
    });
    logTest('Required field validation', false);
  } catch (error) {
    logTest('Required field validation', true);
  }

  // Test 3: BigInt handling for price
  console.log('\nTest 3: BigInt price handling');
  try {
    const testCreator = await prisma.creator.create({
      data: {
        address: '0x1111111111111111111111111111111111111111111111111111111111111111',
        profileId: 'bigint_test',
        name: 'bigint_test',
        bio: 'Testing BigInt',
      },
    });

    const tier = await prisma.tier.create({
      data: {
        tierId: 'tier_bigint_test',
        creatorId: testCreator.id,
        name: 'BigInt Test Tier',
        description: 'Testing large numbers',
        price: BigInt('999999999999999999'), // Very large number
      },
    });

    const retrieved = await prisma.tier.findUnique({
      where: { id: tier.id },
    });

    const priceMatches = retrieved?.price === BigInt('999999999999999999');
    logTest('BigInt price storage and retrieval', priceMatches);

    // Cleanup
    await prisma.tier.delete({ where: { id: tier.id } });
    await prisma.creator.delete({ where: { id: testCreator.id } });
  } catch (error) {
    console.error('BigInt test error:', error);
    logTest('BigInt price storage and retrieval', false);
  }

  // Test 4: Cascade delete from Creator to Tier
  console.log('\nTest 4: Cascade delete (Creator → Tier)');
  try {
    const testCreator = await prisma.creator.create({
      data: {
        address: '0x2222222222222222222222222222222222222222222222222222222222222222',
        profileId: 'cascade_test',
        name: 'cascade_test',
        bio: 'Testing cascade delete',
      },
    });

    const tier = await prisma.tier.create({
      data: {
        tierId: 'tier_cascade_test',
        creatorId: testCreator.id,
        name: 'Cascade Test Tier',
        description: 'Will be deleted',
        price: BigInt(1000000000),
      },
    });

    // Delete creator, tier should cascade
    await prisma.creator.delete({ where: { id: testCreator.id } });

    // Verify tier was deleted
    const tierExists = await prisma.tier.findUnique({
      where: { id: tier.id },
    });

    logTest('Cascade delete Creator → Tier', tierExists === null);
  } catch (error) {
    console.error('Cascade delete test error:', error);
    logTest('Cascade delete Creator → Tier', false);
  }

  // Test 5: Cascade delete from Tier to Subscription
  console.log('\nTest 5: Cascade delete (Tier → Subscription)');
  try {
    const testCreator = await prisma.creator.create({
      data: {
        address: '0x3333333333333333333333333333333333333333333333333333333333333333',
        profileId: 'cascade_sub_test',
        name: 'cascade_sub_test',
        bio: 'Testing subscription cascade',
      },
    });

    const tier = await prisma.tier.create({
      data: {
        tierId: 'tier_sub_cascade',
        creatorId: testCreator.id,
        name: 'Sub Cascade Test',
        description: 'Test',
        price: BigInt(1000000000),
      },
    });

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionId: 'sub_cascade_test',
        subscriber: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        tierId: tier.id,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Delete tier, subscription should cascade
    await prisma.tier.delete({ where: { id: tier.id } });

    // Verify subscription was deleted
    const subExists = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });

    logTest('Cascade delete Tier → Subscription', subExists === null);

    // Cleanup
    await prisma.creator.delete({ where: { id: testCreator.id } });
  } catch (error) {
    console.error('Subscription cascade test error:', error);
    logTest('Cascade delete Tier → Subscription', false);
  }

  // Test 6: Many-to-many cascade (ContentTier)
  console.log('\nTest 6: Many-to-many cascade delete');
  try {
    const testCreator = await prisma.creator.create({
      data: {
        address: '0x4444444444444444444444444444444444444444444444444444444444444444',
        profileId: 'm2m_test',
        name: 'm2m_test',
        bio: 'Testing many-to-many cascade',
      },
    });

    const tier = await prisma.tier.create({
      data: {
        tierId: 'tier_m2m_test',
        creatorId: testCreator.id,
        name: 'M2M Test Tier',
        description: 'Test',
        price: BigInt(1000000000),
      },
    });

    const content = await prisma.content.create({
      data: {
        contentId: 'content_m2m_test',
        creatorId: testCreator.id,
        title: 'M2M Test Content',
        description: 'Test',
        contentType: 'text/plain',
        sealedPatchId: 'blob_test',
      },
    });

    const contentTier = await prisma.contentTier.create({
      data: {
        contentId: content.id,
        tierId: tier.id,
      },
    });

    // Delete content, junction should cascade
    await prisma.content.delete({ where: { id: content.id } });

    // Verify junction was deleted
    const junctionExists = await prisma.contentTier.findUnique({
      where: {
        contentId_tierId: {
          contentId: content.id,
          tierId: tier.id,
        },
      },
    });

    logTest('Many-to-many cascade delete (Content → ContentTier)', junctionExists === null);

    // Cleanup
    await prisma.tier.delete({ where: { id: tier.id } });
    await prisma.creator.delete({ where: { id: testCreator.id } });
  } catch (error) {
    console.error('Many-to-many cascade test error:', error);
    logTest('Many-to-many cascade delete (Content → ContentTier)', false);
  }

  // Test 7: DateTime handling
  console.log('\nTest 7: DateTime field handling');
  try {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const testCreator = await prisma.creator.findFirst();
    const testTier = await prisma.tier.findFirst();

    if (testCreator && testTier) {
      const sub = await prisma.subscription.create({
        data: {
          subscriptionId: 'datetime_test',
          subscriber: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
          tierId: testTier.id,
          startsAt: now,
          expiresAt: future,
        },
      });

      const retrieved = await prisma.subscription.findUnique({
        where: { id: sub.id },
      });

      const datesMatch =
        retrieved?.startsAt.getTime() === now.getTime() &&
        retrieved?.expiresAt.getTime() === future.getTime();

      logTest('DateTime field handling', datesMatch);

      // Cleanup
      await prisma.subscription.delete({ where: { id: sub.id } });
    } else {
      logTest('DateTime field handling', false);
    }
  } catch (error) {
    console.error('DateTime test error:', error);
    logTest('DateTime field handling', false);
  }

  // Display summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed === 0) {
    console.log('\n✅ All data integrity tests passed!');
  } else {
    console.log(`\n⚠️ ${results.failed} test(s) failed`);
    process.exit(1);
  }
}

// Execute tests
main()
  .catch((error) => {
    console.error('❌ Data integrity test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
