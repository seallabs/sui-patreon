-- Rename columns instead of drop/add to preserve existing data
ALTER TABLE "Content" RENAME COLUMN "walrusBlobId" TO "sealedPatchId";
ALTER TABLE "Content" RENAME COLUMN "previewBlobId" TO "previewPatchId";
