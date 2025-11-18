-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "ContentTier" DROP CONSTRAINT "ContentTier_contentId_fkey";

-- DropForeignKey
ALTER TABLE "ContentTier" DROP CONSTRAINT "ContentTier_tierId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_tierId_fkey";

-- DropForeignKey
ALTER TABLE "Tier" DROP CONSTRAINT "Tier_creatorId_fkey";
