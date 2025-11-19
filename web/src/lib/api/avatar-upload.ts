/**
 * Avatar upload utility
 *
 * Handles uploading avatar images to the MinIO backend
 * Follows SOLID principles - single responsibility for avatar operations
 */

interface AvatarUploadResponse {
  success: boolean;
  filename?: string;
  url?: string;
  size?: number;
  contentType?: string;
  error?: string;
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload avatar image to MinIO backend
 *
 * @param file - Avatar image file (JPEG, JPG, or PNG)
 * @returns Promise with upload result containing URL
 * @throws Error if upload fails
 */
export async function uploadAvatar(file: File): Promise<string> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG and PNG images are allowed.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    // Convert to base64
    const base64 = await fileToBase64(file);

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Upload to backend
    const response = await fetch(`${backendUrl}/api/avatar/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        contentType: file.type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const data: AvatarUploadResponse = await response.json();

    if (!data.success || !data.url) {
      throw new Error(data.error || 'Upload failed - no URL returned');
    }

    return data.url;
  } catch (error) {
    console.error('Avatar upload error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload avatar');
  }
}

/**
 * Get avatar URL from filename
 *
 * @param filename - Avatar filename from MinIO
 * @returns Full URL to avatar image
 */
export function getAvatarUrl(filename: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${backendUrl}/api/avatar/${filename}`;
}
