/*
  Warnings:

  - You are about to drop the column `embedding` on the `ModelProfile` table. All the data in the column will be lost.
  - You are about to drop the column `license` on the `ModelProfile` table. All the data in the column will be lost.
  - You are about to drop the column `modality` on the `ModelProfile` table. All the data in the column will be lost.
  - You are about to drop the column `paramsBillion` on the `ModelProfile` table. All the data in the column will be lost.
  - You are about to drop the column `resultsJson` on the `RecommendationEvent` table. All the data in the column will be lost.
  - Added the required column `results` to the `RecommendationEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ModelProfile" DROP COLUMN "embedding",
DROP COLUMN "license",
DROP COLUMN "modality",
DROP COLUMN "paramsBillion";

-- AlterTable
ALTER TABLE "RecommendationEvent" DROP COLUMN "resultsJson",
ADD COLUMN     "results" JSONB NOT NULL;
