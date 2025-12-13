/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Item";

-- CreateTable
CREATE TABLE "ModelProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "source" TEXT,
    "url" TEXT,
    "family" TEXT,
    "paramsBillion" DOUBLE PRECISION,
    "modality" TEXT,
    "domainTags" JSONB NOT NULL DEFAULT '[]',
    "license" TEXT,
    "contextWindow" INTEGER,
    "apiType" TEXT,
    "costPer1kTokens" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "task" TEXT NOT NULL,
    "privacy" TEXT NOT NULL,
    "latency" INTEGER NOT NULL,
    "context" INTEGER NOT NULL,
    "resultsJson" JSONB NOT NULL,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
