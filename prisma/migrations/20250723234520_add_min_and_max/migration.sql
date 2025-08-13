/*
  Warnings:

  - Added the required column `maxLimit` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minLimit` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "maxLimit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "minLimit" DOUBLE PRECISION NOT NULL;
