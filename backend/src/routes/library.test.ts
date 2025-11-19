/**
 * Library API Routes Tests
 *
 * Tests for the library endpoint functionality.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('Library API', () => {
  let testCreator: any;
  let testContent: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.content.deleteMany({
      where: { title: { contains: '[TEST]' } },
    });
    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_library' } },
    });

    // Create test creator
    testCreator = await prisma.creator.create({
      data: {
        address: '0xtest_library_creator_0000000000000000000000000000000000000000000000',
        profileId: '0xtest_library_profile_000000000000000000000000000000000000000000000',
        name: 'test-library-creator',
        bio: 'Test creator for library',
      },
    });

    // Create test content
    testContent = await prisma.content.create({
      data: {
        contentId: '0xtest_library_content_000000000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST] Sample Post',
        description: 'Test post description',
        contentType: 'text/markdown',
        sealedPatchId: 'test_blob_id',
        isPublic: true,
        isDraft: false,
        publishedAt: new Date(),
        viewCount: 100,
        likeCount: 25,
      },
    });
  });

  it('should map content type to post type correctly', () => {
    const testCases = [
      { input: 'video/mp4', expected: 'video' },
      { input: 'audio/mpeg', expected: 'audio' },
      { input: 'image/png', expected: 'image' },
      { input: 'text/markdown', expected: 'text' },
      { input: 'application/pdf', expected: 'text' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = mapContentTypeToPostType(input);
      expect(result).toBe(expected);
    });
  });

  it('should fetch library posts for a creator', async () => {
    const response = await fetch(
      `http://localhost:3001/api/library/${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.posts).toBeDefined();
    expect(data.pagination).toBeDefined();
    expect(Array.isArray(data.posts)).toBe(true);
  });

  it('should handle pagination correctly', async () => {
    const response = await fetch(
      `http://localhost:3001/api/library/${testCreator.address}?page=1&limit=10`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.pagination.currentPage).toBe(1);
    expect(data.pagination.totalPages).toBeGreaterThanOrEqual(0);
  });

  it('should filter by tab (posts vs drafts)', async () => {
    // Create a draft
    const draft = await prisma.content.create({
      data: {
        contentId: '0xtest_library_draft_0000000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST] Draft Post',
        description: 'Test draft',
        contentType: 'text/markdown',
        sealedPatchId: 'test_draft_blob',
        isPublic: false,
        isDraft: true,
      },
    });

    // Fetch posts
    const postsResponse = await fetch(
      `http://localhost:3001/api/library/${testCreator.address}?tab=posts`
    );
    const postsData = await postsResponse.json();

    // Fetch drafts
    const draftsResponse = await fetch(
      `http://localhost:3001/api/library/${testCreator.address}?tab=drafts`
    );
    const draftsData = await draftsResponse.json();

    expect(postsData.posts.every((p: any) => !p.isDraft)).toBe(true);
    expect(draftsData.posts.every((p: any) => p.isDraft)).toBe(true);

    // Clean up
    await prisma.content.delete({ where: { id: draft.id } });
  });

  it('should return 404 for non-existent creator', async () => {
    const response = await fetch(
      'http://localhost:3001/api/library/0xnonexistent000000000000000000000000000000000000000000000000000000'
    );

    expect(response.status).toBe(404);
  });

  it('should handle search filtering', async () => {
    const response = await fetch(
      `http://localhost:3001/api/library/${testCreator.address}?search=Sample`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.posts.some((p: any) => p.title.includes('Sample'))).toBe(true);
  });
});

// Helper function for testing
function mapContentTypeToPostType(
  contentType: string
): 'text' | 'video' | 'audio' | 'image' {
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('image/')) return 'image';
  return 'text';
}
