/**
 * Utility functions for handling attachments
 */

/**
 * Convert Uint8Array to a Blob URL
 */
export function uint8ArrayToBlobUrl(data: Uint8Array, mimeType: string): string {
  const blob = new Blob([data as BlobPart], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if a MIME type represents an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get a file icon based on MIME type or extension
 */
export function getFileIcon(mimeType: string, filename: string): string {
  if (isImageMimeType(mimeType)) {
    return '🖼️';
  }
  
  const ext = getFileExtension(filename);
  
  // Document types
  if (mimeType.includes('pdf') || ext === 'pdf') return '📄';
  if (mimeType.includes('word') || ext === 'doc' || ext === 'docx') return '📝';
  if (mimeType.includes('excel') || ext === 'xls' || ext === 'xlsx') return '📊';
  if (mimeType.includes('powerpoint') || ext === 'ppt' || ext === 'pptx') return '📊';
  
  // Archive types
  if (mimeType.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
  
  // Audio types
  if (mimeType.startsWith('audio/')) return '🎵';
  
  // Video types
  if (mimeType.startsWith('video/')) return '🎬';
  
  // Code types
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'].includes(ext)) {
    return '💻';
  }
  
  // Default
  return '📎';
}

/**
 * Create a download link for a file
 */
export function createDownloadLink(data: Uint8Array, filename: string, mimeType: string): HTMLAnchorElement {
  const blob = new Blob([data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  return link;
}

/**
 * Download a file from Uint8Array data
 */
export function downloadFile(data: Uint8Array, filename: string, mimeType: string): void {
  const link = createDownloadLink(data, filename, mimeType);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

