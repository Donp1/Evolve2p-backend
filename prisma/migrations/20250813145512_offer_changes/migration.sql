/*
  Warnings:

  - You are about to drop the column `amountCrypto` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `amountFiat` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Offer` table. All the data in the column will be lost.
  - Added the required column `paymentMethodId` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TradeStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "TradeStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "amountCrypto",
DROP COLUMN "amountFiat",
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethodId" TEXT NOT NULL,
ADD COLUMN     "terms" TEXT,
ADD COLUMN     "time" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "escrowReleased" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
