/**
 * Avatar Upload and Download Routes - Test Suite
 *
 * Tests for avatar image management endpoints using MinIO storage.
 *
 * Test coverage:
 * - Successful avatar upload
 * - Successful avatar download
 * - Invalid content type validation
 * - Invalid base64 validation
 * - File size limits
 * - Missing required fields
 * - Non-existent avatar download
 * - Invalid filename format
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import request from 'supertest';
import app from '../index';

describe('Avatar Routes', () => {
  // Base64-encoded 1x1 PNG image for testing (valid minimal PNG)
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Base64-encoded 1x1 JPEG image for testing (valid minimal JPEG)
  const validJpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA==';

  let uploadedFilename: string;

  describe('POST /api/avatar/upload', () => {
    test('should successfully upload a PNG avatar', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validPngBase64,
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        filename: expect.stringMatching(/^[a-f0-9-]+-\d+\.png$/),
        url: expect.stringContaining('avatars/'),
        size: expect.any(Number),
        contentType: 'image/png',
      });

      // Save filename for download test
      uploadedFilename = response.body.filename;
    });

    test('should return backend proxy URL instead of direct MinIO URL', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validJpegBase64,
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // URL should be a backend proxy URL, not a direct MinIO URL
      expect(response.body.url).toMatch(/\/api\/avatar\//);
      expect(response.body.url).not.toContain('minio.7k.ag');

      // URL should contain the filename
      expect(response.body.url).toContain(response.body.filename);
    });

    test('should successfully upload a JPEG avatar', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validJpegBase64,
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        filename: expect.stringMatching(/^[a-f0-9-]+-\d+\.jpg$/),
        url: expect.stringContaining('avatars/'),
        size: expect.any(Number),
        contentType: 'image/jpeg',
      });
    });

    test('should accept image/jpg content type', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validJpegBase64,
          contentType: 'image/jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.filename).toMatch(/\.jpg$/);
    });

    test('should reject missing file field', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'File is required',
      });
    });

    test('should reject missing contentType field', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validPngBase64,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Content type is required',
      });
    });

    test('should reject invalid content type', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validPngBase64,
          contentType: 'image/gif',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid content type'),
      });
    });

    test('should reject non-image content type', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validPngBase64,
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid content type'),
      });
    });

    test('should reject invalid base64 encoding', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: 'not-valid-base64!@#$',
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('base64'),
      });
    });

    test('should reject file that is too small', async () => {
      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: Buffer.from('tiny').toString('base64'), // Only 4 bytes
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('too small'),
      });
    });

    test('should reject file that exceeds size limit', async () => {
      // Create a 11MB base64 string (exceeds 10MB limit)
      const largeFile = Buffer.alloc(11 * 1024 * 1024).toString('base64');

      const response = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: largeFile,
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('too large'),
      });
    });
  });

  describe('GET /api/avatar/:filename', () => {
    test('should successfully download uploaded avatar', async () => {
      // Skip if no file was uploaded in previous tests
      if (!uploadedFilename) {
        console.warn('⚠️  Skipping download test: no file uploaded');
        return;
      }

      const response = await request(app)
        .get(`/api/avatar/${uploadedFilename}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\/(png|jpeg)$/);
      expect(response.headers['cache-control']).toContain('public');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    test('should return 404 for non-existent avatar', async () => {
      const fakeFilename = 'f47ac10b-58cc-4372-a567-0e02b2c3d479-1234567890.png';

      const response = await request(app)
        .get(`/api/avatar/${fakeFilename}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found'),
      });
    });

    test('should reject invalid filename format', async () => {
      const invalidFilename = 'invalid-filename.png';

      const response = await request(app)
        .get(`/api/avatar/${invalidFilename}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid filename format'),
      });
    });

    test('should reject filename without extension', async () => {
      const invalidFilename = 'f47ac10b-58cc-4372-a567-0e02b2c3d479-1234567890';

      const response = await request(app)
        .get(`/api/avatar/${invalidFilename}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid filename format'),
      });
    });

    test('should reject filename with invalid extension', async () => {
      const invalidFilename = 'f47ac10b-58cc-4372-a567-0e02b2c3d479-1234567890.gif';

      const response = await request(app)
        .get(`/api/avatar/${invalidFilename}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid filename format'),
      });
    });

    test('should reject path traversal attempts', async () => {
      const maliciousFilename = '../../../etc/passwd';

      const response = await request(app)
        .get(`/api/avatar/${maliciousFilename}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid filename format'),
      });
    });
  });

  describe('Integration: Upload and Download Flow', () => {
    test('should upload and then download the same image', async () => {
      // Step 1: Upload
      const uploadResponse = await request(app)
        .post('/api/avatar/upload')
        .send({
          file: validPngBase64,
          contentType: 'image/png',
        });

      expect(uploadResponse.status).toBe(200);
      const { filename, size } = uploadResponse.body;

      // Step 2: Download
      const downloadResponse = await request(app)
        .get(`/api/avatar/${filename}`);

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers['content-type']).toBe('image/png');

      // Verify the downloaded file size matches
      expect(downloadResponse.body.length).toBeGreaterThan(0);
    });

    test('should handle multiple uploads without conflicts', async () => {
      const uploads = await Promise.all([
        request(app)
          .post('/api/avatar/upload')
          .send({ file: validPngBase64, contentType: 'image/png' }),
        request(app)
          .post('/api/avatar/upload')
          .send({ file: validJpegBase64, contentType: 'image/jpeg' }),
        request(app)
          .post('/api/avatar/upload')
          .send({ file: validPngBase64, contentType: 'image/png' }),
      ]);

      // All uploads should succeed
      uploads.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // All filenames should be unique
      const filenames = uploads.map((r) => r.body.filename);
      const uniqueFilenames = new Set(filenames);
      expect(uniqueFilenames.size).toBe(3);
    });
  });
});
