/*
  Warnings:

  - You are about to drop the column `interviewQuestions` on the `Resume` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `Resume` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Resume" DROP COLUMN "interviewQuestions",
DROP COLUMN "skills";
