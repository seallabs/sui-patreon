-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "topic" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Creator_topic_idx" ON "Creator"("topic");
