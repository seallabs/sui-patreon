-- CreateTable
CREATE TABLE "ChannelMapping" (
    "id" UUID NOT NULL,
    "channelId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMapping_channelId_key" ON "ChannelMapping"("channelId");

-- CreateIndex
CREATE INDEX "ChannelMapping_userAddress_idx" ON "ChannelMapping"("userAddress");

-- CreateIndex
CREATE INDEX "ChannelMapping_creatorAddress_idx" ON "ChannelMapping"("creatorAddress");

-- CreateIndex
CREATE INDEX "ChannelMapping_channelId_idx" ON "ChannelMapping"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMapping_userAddress_creatorAddress_key" ON "ChannelMapping"("userAddress", "creatorAddress");
