/*
  Warnings:

  - The values [WITHDRAWAL] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEPOSIT', 'TRANSFER', 'INTERNAL_TRANSFER', 'WITHSRAWAL', 'ESCROW_IN', 'ESCROW_OUT', 'TRADE_PAYMENT', 'TRADE_RELEASE', 'TRADE_REFUND');
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;
