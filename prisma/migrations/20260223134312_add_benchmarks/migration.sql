-- CreateTable
CREATE TABLE "Benchmark" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'percent',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkResult" (
    "id" SERIAL NOT NULL,
    "modelId" TEXT NOT NULL,
    "benchmarkId" INTEGER NOT NULL,
    "scoreRaw" DOUBLE PRECISION NOT NULL,
    "scoreNormalized" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "runId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAlias" (
    "id" SERIAL NOT NULL,
    "modelId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "ModelAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_key_key" ON "Benchmark"("key");

-- CreateIndex
CREATE INDEX "BenchmarkResult_modelId_benchmarkId_idx" ON "BenchmarkResult"("modelId", "benchmarkId");

-- CreateIndex
CREATE INDEX "BenchmarkResult_benchmarkId_recordedAt_idx" ON "BenchmarkResult"("benchmarkId", "recordedAt");

-- CreateIndex
CREATE INDEX "BenchmarkResult_modelId_recordedAt_idx" ON "BenchmarkResult"("modelId", "recordedAt");

-- CreateIndex
CREATE INDEX "ModelAlias_modelId_idx" ON "ModelAlias"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelAlias_source_alias_key" ON "ModelAlias"("source", "alias");

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAlias" ADD CONSTRAINT "ModelAlias_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
