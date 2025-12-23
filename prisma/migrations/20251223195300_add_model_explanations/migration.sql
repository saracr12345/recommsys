-- AlterTable
ALTER TABLE "ModelProfile" ADD COLUMN     "cons" JSONB,
ADD COLUMN     "limitations" JSONB,
ADD COLUMN     "pros" JSONB,
ADD COLUMN     "ragTips" JSONB,
ADD COLUMN     "strengths" JSONB,
ADD COLUMN     "typicalUseCases" JSONB;
