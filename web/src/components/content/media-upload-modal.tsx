'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MediaType } from '@/types';
import { File, Upload, X } from 'lucide-react';
import { DragEvent, useCallback, useEffect, useState } from 'react';

interface MediaUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: MediaType;
  onFilesChanged: (preview: File | null, exclusive: File | null) => void;
  initialFiles?: { preview: File | null; exclusive: File | null };
}

// File type accept patterns for each media type
const getAcceptPattern = (
  mediaType: MediaType,
  field: 'preview' | 'exclusive'
): string => {
  if (field === 'preview') {
    return 'image/*';
  }

  switch (mediaType) {
    case 'image':
      return 'image/*';
    case 'video':
      return 'video/*';
    case 'audio':
      return 'audio/*';
    case 'attachment':
      return '*/*';
    default:
      return '*/*';
  }
};

// Validate file type
const isValidFileType = (
  file: File,
  mediaType: MediaType,
  field: 'preview' | 'exclusive'
): boolean => {
  if (field === 'preview') {
    return file.type.toLowerCase().startsWith('image/');
  }

  if (mediaType === 'attachment') return true;

  const type = file.type.toLowerCase();
  switch (mediaType) {
    case 'image':
      return type.startsWith('image/');
    case 'video':
      return type.startsWith('video/');
    case 'audio':
      return type.startsWith('audio/');
    default:
      return false;
  }
};

export function MediaUploadModal({
  open,
  onOpenChange,
  mediaType,
  onFilesChanged,
  initialFiles,
}: MediaUploadModalProps) {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [exclusiveFile, setExclusiveFile] = useState<File | null>(null);
  const [previewDragActive, setPreviewDragActive] = useState(false);
  const [exclusiveDragActive, setExclusiveDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update files when modal opens with initialFiles (when reopening with existing files)
  useEffect(() => {
    if (open) {
      if (initialFiles) {
        // Restore previously selected files
        setPreviewFile(initialFiles.preview);
        setExclusiveFile(initialFiles.exclusive);
      } else {
        // Reset files when opening for a new selection
        setPreviewFile(null);
        setExclusiveFile(null);
      }
      setError(null);
    }
  }, [open, initialFiles]);

  const previewAcceptPattern = getAcceptPattern(mediaType, 'preview');
  const exclusiveAcceptPattern = getAcceptPattern(mediaType, 'exclusive');

  const handleFileSelect = useCallback(
    (
      file: File | null,
      type: 'preview' | 'exclusive',
      source: 'input' | 'drop'
    ) => {
      if (!file) {
        if (type === 'preview') setPreviewFile(null);
        else setExclusiveFile(null);
        return;
      }

      if (!isValidFileType(file, mediaType, type)) {
        setError(`Invalid file type. Please select a ${mediaType} file.`);
        return;
      }

      setError(null);
      if (type === 'preview') {
        setPreviewFile(file);
      } else {
        setExclusiveFile(file);
      }
    },
    [mediaType]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, type: 'preview' | 'exclusive') => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'preview') {
        setPreviewDragActive(true);
      } else {
        setExclusiveDragActive(true);
      }
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>, type: 'preview' | 'exclusive') => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'preview') {
        setPreviewDragActive(false);
      } else {
        setExclusiveDragActive(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, type: 'preview' | 'exclusive') => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'preview') {
        setPreviewDragActive(false);
      } else {
        setExclusiveDragActive(false);
      }

      const file = e.dataTransfer.files?.[0] || null;
      handleFileSelect(file, type, 'drop');
    },
    [handleFileSelect]
  );

  const handleConfirm = () => {
    if (!previewFile || !exclusiveFile) {
      setError('Please select both preview and exclusive files.');
      return;
    }

    onFilesChanged(previewFile, exclusiveFile);
    onOpenChange(false);
    // Don't reset files on confirm - they're saved via callback
    setError(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Don't reset files on cancel - keep them for next time modal opens
    setError(null);
  };

  const FileDropZone = ({
    file,
    type,
    dragActive,
  }: {
    file: File | null;
    type: 'preview' | 'exclusive';
    dragActive: boolean;
  }) => (
    <div
      className={`relative flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
        dragActive
          ? 'border-primary bg-primary/10'
          : file
          ? 'border-primary/50 bg-primary/5'
          : 'border-muted-foreground/25 bg-muted/10'
      }`}
      onDragOver={(e) => handleDragOver(e, type)}
      onDragLeave={(e) => handleDragLeave(e, type)}
      onDrop={(e) => handleDrop(e, type)}
    >
      <input
        type='file'
        accept={
          type === 'preview' ? previewAcceptPattern : exclusiveAcceptPattern
        }
        className='absolute inset-0 cursor-pointer opacity-0'
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          handleFileSelect(selectedFile, type, 'input');
        }}
      />
      {file ? (
        <div className='flex flex-col items-center gap-2 p-4'>
          <File className='h-12 w-12 text-primary' />
          <p className='text-sm font-medium'>{file.name}</p>
          <p className='text-xs text-muted-foreground'>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation();
              handleFileSelect(null, type, 'input');
            }}
            className='mt-2'
          >
            <X className='mr-2 h-4 w-4' />
            Remove
          </Button>
        </div>
      ) : (
        <div className='flex flex-col items-center gap-2 p-4 text-center'>
          <Upload className='h-12 w-12 text-muted-foreground' />
          <p className='text-sm font-medium'>
            Drop {type === 'preview' ? 'preview' : 'exclusive'} file here
          </p>
          <p className='text-xs text-muted-foreground'>or click to browse</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Upload {mediaType} files</DialogTitle>
          <DialogDescription>
            Select preview (image) and exclusive files. Preview must be an
            image, while the exclusive file must match the selected {mediaType}{' '}
            type.
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-4 py-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Preview File</label>
            <FileDropZone
              file={previewFile}
              type='preview'
              dragActive={previewDragActive}
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Exclusive File</label>
            <FileDropZone
              file={exclusiveFile}
              type='exclusive'
              dragActive={exclusiveDragActive}
            />
          </div>
        </div>

        {error && <p className='text-sm text-destructive'>{error}</p>}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleConfirm}
            disabled={!previewFile || !exclusiveFile}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
