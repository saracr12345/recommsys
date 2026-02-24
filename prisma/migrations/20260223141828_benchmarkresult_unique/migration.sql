/*
  Warnings:

  - A unique constraint covering the columns `[modelId,benchmarkId,source,runId]` on the table `BenchmarkResult` will be added. If there are existing duplicate values, this will fail.
  - Made the column `runId` on table `BenchmarkResult` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BenchmarkResult" ALTER COLUMN "runId" SET NOT NULL,
ALTER COLUMN "runId" SET DEFAULT 'latest';

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkResult_modelId_benchmarkId_source_runId_key" ON "BenchmarkResult"("modelId", "benchmarkId", "source", "runId");
