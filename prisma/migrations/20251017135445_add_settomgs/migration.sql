-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "withdrawalLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "depositLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sendCryptoFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tradingFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "supportEmail" TEXT,
    "supportPhoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
