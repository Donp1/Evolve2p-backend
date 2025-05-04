/*
  Warnings:

  - You are about to drop the column `secrete` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "secrete",
ADD COLUMN     "secret" TEXT;
