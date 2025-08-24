-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "crypto" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_tradeId_key" ON "Escrow"("tradeId");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
