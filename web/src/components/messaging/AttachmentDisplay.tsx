'use client';

import { useState, useEffect } from 'react';
import { LazyDecryptAttachmentResult } from '@mysten/messaging';
import {
  formatFileSize,
  isImageMimeType,
  getFileIcon,
  uint8ArrayToBlobUrl,
  downloadFile,
} from '@/lib/messaging/attachments';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AttachmentDisplayProps {
  attachment: LazyDecryptAttachmentResult;
}

export function AttachmentDisplay({ attachment }: AttachmentDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(true);

  const isImage = isImageMimeType(attachment.mimeType);
  const fileIcon = getFileIcon(attachment.mimeType, attachment.fileName);

  // Decrypt and load attachment data
  useEffect(() => {
    let isMounted = true;
    let blobUrl: string | null = null;

    const loadAttachment = async () => {
      try {
        setIsDecrypting(true);
        const data = await attachment.data;

        if (!isMounted) return;

        if (isImage) {
          // For images, create a blob URL for display
          blobUrl = uint8ArrayToBlobUrl(data, attachment.mimeType);
          setImageUrl(blobUrl);
        }
        setIsDecrypting(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load attachment');
        setIsDecrypting(false);
      }
    };

    loadAttachment();

    return () => {
      isMounted = false;
      // Clean up blob URL when component unmounts
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [attachment, isImage]);

  const handleDownload = async () => {
    try {
      const data = await attachment.data;
      downloadFile(data, attachment.fileName, attachment.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download attachment');
    }
  };

  if (error) {
    return (
      <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2">
        <p className="text-xs text-red-500">
          Error loading attachment: {error}
        </p>
      </div>
    );
  }

  if (isImage) {
    // Image display
    return (
      <div className="mt-2 max-w-[300px] overflow-hidden rounded-md">
        {isDecrypting ? (
          <div className="flex min-h-[100px] items-center justify-center bg-muted p-4">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-xs text-muted-foreground">
                Decrypting image...
              </p>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt={attachment.fileName}
              className="block h-auto max-w-full cursor-pointer"
              onClick={() => {
                // Open image in new tab/window for full view
                window.open(imageUrl!, '_blank');
              }}
              onError={() => {
                setError('Failed to load image');
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
              <div className="flex items-center justify-between">
                <p className="flex-1 truncate text-xs text-white">
                  {attachment.fileName}
                </p>
                <p className="ml-2 text-xs text-gray-300">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Non-image file display
  return (
    <div className="mt-2 max-w-[300px] rounded-md border bg-muted p-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{fileIcon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{attachment.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>
        {isDecrypting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
          >
            Download
          </Button>
        )}
      </div>
    </div>
  );
}

