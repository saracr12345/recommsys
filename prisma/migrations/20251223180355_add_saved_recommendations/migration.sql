-- CreateTable
CREATE TABLE "SavedRecommendation" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SavedRecommendation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedRecommendation" ADD CONSTRAINT "SavedRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRecommendation" ADD CONSTRAINT "SavedRecommendation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RecommendationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
