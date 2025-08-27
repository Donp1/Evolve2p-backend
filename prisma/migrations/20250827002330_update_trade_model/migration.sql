/*
  Warnings:

  - The values [FILE] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[tradeId]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');
ALTER TABLE "Message" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Message" ALTER COLUMN "type" TYPE "MessageType_new" USING ("type"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";
ALTER TABLE "Message" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_tradeId_key" ON "Chat"("tradeId");
