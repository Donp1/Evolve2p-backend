-- CreateTable
CREATE TABLE "Trust" (
    "id" TEXT NOT NULL,
    "trusterId" TEXT NOT NULL,
    "trustedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trust_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Trust" ADD CONSTRAINT "Trust_trustedId_fkey" FOREIGN KEY ("trustedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
