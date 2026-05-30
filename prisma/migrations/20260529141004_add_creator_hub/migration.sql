-- CreateEnum
CREATE TYPE "EntryCategory" AS ENUM ('YOUTUBER', 'SOCIAL_CREATOR', 'STREAMER_BREAKER', 'INVESTOR_X', 'PODCAST', 'MARKETPLACE', 'LGS', 'GROUP_BREAK', 'GRADING', 'AUTHENTICATION', 'TOOL_SITE', 'NEWS_BLOG', 'COMMUNITY');

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EntryCategory" NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'live',
    "voteScore" INTEGER NOT NULL DEFAULT 0,
    "heatScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "youtubeChannelId" TEXT,
    "ytSubscribers" INTEGER,
    "submitterHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryLink" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "EntryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryVote" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryMetric" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ytSubscribers" INTEGER,
    "ytViews" BIGINT,
    "upvotes7d" INTEGER,
    "views7d" INTEGER,

    CONSTRAINT "EntryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorCall" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "calledAt" TIMESTAMP(3) NOT NULL,
    "priceAtCallC" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entry_slug_key" ON "Entry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_youtubeChannelId_key" ON "Entry"("youtubeChannelId");

-- CreateIndex
CREATE INDEX "Entry_category_heatScore_idx" ON "Entry"("category", "heatScore");

-- CreateIndex
CREATE INDEX "Entry_status_idx" ON "Entry"("status");

-- CreateIndex
CREATE INDEX "Entry_submitterHash_idx" ON "Entry"("submitterHash");

-- CreateIndex
CREATE INDEX "EntryLink_entryId_idx" ON "EntryLink"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryVote_entryId_voterHash_key" ON "EntryVote"("entryId", "voterHash");

-- CreateIndex
CREATE UNIQUE INDEX "EntryMetric_entryId_date_key" ON "EntryMetric"("entryId", "date");

-- CreateIndex
CREATE INDEX "CreatorCall_entryId_idx" ON "CreatorCall"("entryId");

-- CreateIndex
CREATE INDEX "CreatorCall_cardId_idx" ON "CreatorCall"("cardId");

-- AddForeignKey
ALTER TABLE "EntryLink" ADD CONSTRAINT "EntryLink_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryVote" ADD CONSTRAINT "EntryVote_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryMetric" ADD CONSTRAINT "EntryMetric_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorCall" ADD CONSTRAINT "CreatorCall_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorCall" ADD CONSTRAINT "CreatorCall_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
