/*
  Warnings:

  - Made the column `cons` on table `ModelProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `limitations` on table `ModelProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pros` on table `ModelProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ragTips` on table `ModelProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `strengths` on table `ModelProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `typicalUseCases` on table `ModelProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ModelProfile" ALTER COLUMN "cons" SET NOT NULL,
ALTER COLUMN "cons" SET DEFAULT '[]',
ALTER COLUMN "limitations" SET NOT NULL,
ALTER COLUMN "limitations" SET DEFAULT '[]',
ALTER COLUMN "pros" SET NOT NULL,
ALTER COLUMN "pros" SET DEFAULT '[]',
ALTER COLUMN "ragTips" SET NOT NULL,
ALTER COLUMN "ragTips" SET DEFAULT '[]',
ALTER COLUMN "strengths" SET NOT NULL,
ALTER COLUMN "strengths" SET DEFAULT '[]',
ALTER COLUMN "typicalUseCases" SET NOT NULL,
ALTER COLUMN "typicalUseCases" SET DEFAULT '[]';
