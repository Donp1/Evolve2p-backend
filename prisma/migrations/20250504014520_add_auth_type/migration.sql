-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authType" TEXT,
ADD COLUMN     "is2faEnabled" BOOLEAN DEFAULT false;
