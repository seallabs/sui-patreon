-- CreateTable
CREATE TABLE "IndexerCheckpoint" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "lastEventSeq" TEXT NOT NULL,
    "lastTxDigest" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexerCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexerCheckpoint_eventType_key" ON "IndexerCheckpoint"("eventType");

-- CreateIndex
CREATE INDEX "IndexerCheckpoint_eventType_idx" ON "IndexerCheckpoint"("eventType");
