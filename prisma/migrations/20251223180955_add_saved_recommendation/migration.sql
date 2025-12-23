/*
  Warnings:

  - You are about to drop the column `notes` on the `SavedRecommendation` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `SavedRecommendation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,eventId]` on the table `SavedRecommendation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SavedRecommendation" DROP COLUMN "notes",
DROP COLUMN "title",
ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SavedRecommendation_userId_eventId_key" ON "SavedRecommendation"("userId", "eventId");
