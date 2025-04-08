-- CreateTable
CREATE TABLE "EnergyBillData" (
    "id" TEXT NOT NULL,
    "uploadBatchId" TEXT NOT NULL,
    "installationNumber" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "modality" TEXT,
    "quota" DOUBLE PRECISION,
    "tariffPost" TEXT,
    "previousBalance" DOUBLE PRECISION,
    "expiredBalance" DOUBLE PRECISION,
    "consumption" DOUBLE PRECISION,
    "generation" DOUBLE PRECISION,
    "compensation" DOUBLE PRECISION,
    "transferred" DOUBLE PRECISION,
    "received" DOUBLE PRECISION,
    "currentBalance" DOUBLE PRECISION,
    "expiringBalanceAmount" DOUBLE PRECISION,
    "expiringBalancePeriod" TEXT,
    "uploadTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyBillData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnergyBillData_installationNumber_period_idx" ON "EnergyBillData"("installationNumber", "period");

-- CreateIndex
CREATE INDEX "EnergyBillData_uploadBatchId_idx" ON "EnergyBillData"("uploadBatchId");
