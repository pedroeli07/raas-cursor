-- CreateEnum
CREATE TYPE "InstallationType" AS ENUM ('GENERATOR', 'CONSUMER');

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_per_kwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "installationNumber" TEXT NOT NULL,
    "type" "InstallationType" NOT NULL,
    "distributorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyRecord" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "posto_horario" TEXT,
    "saldo_anterior_fora_ponta" DOUBLE PRECISION,
    "consumo_kwh_fora_ponta" DOUBLE PRECISION,
    "geracao_kwh_fora_ponta" DOUBLE PRECISION,
    "compensacao_kwh_fora_ponta" DOUBLE PRECISION,
    "transferido_kwh_fora_ponta" DOUBLE PRECISION,
    "recebimento_kwh_fora_ponta" DOUBLE PRECISION,
    "saldo_atual_kwh_fora_ponta" DOUBLE PRECISION,
    "saldo_anterior_ponta" DOUBLE PRECISION,
    "consumo_kwh_ponta" DOUBLE PRECISION,
    "geracao_kwh_ponta" DOUBLE PRECISION,
    "compensacao_kwh_ponta" DOUBLE PRECISION,
    "transferido_kwh_ponta" DOUBLE PRECISION,
    "recebimento_kwh_ponta" DOUBLE PRECISION,
    "saldo_atual_kwh_ponta" DOUBLE PRECISION,
    "saldo_anterior_total" DOUBLE PRECISION,
    "consumo_total_kwh" DOUBLE PRECISION,
    "geracao_total_kwh" DOUBLE PRECISION,
    "compensacao_total_kwh" DOUBLE PRECISION,
    "transferido_total_kwh" DOUBLE PRECISION,
    "recebimento_total_kwh" DOUBLE PRECISION,
    "saldo_atual_total_kwh" DOUBLE PRECISION,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_name_key" ON "Distributor"("name");

-- CreateIndex
CREATE INDEX "Installation_ownerId_idx" ON "Installation"("ownerId");

-- CreateIndex
CREATE INDEX "Installation_distributorId_idx" ON "Installation"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "Installation_installationNumber_distributorId_key" ON "Installation"("installationNumber", "distributorId");

-- CreateIndex
CREATE INDEX "EnergyRecord_installationId_idx" ON "EnergyRecord"("installationId");

-- CreateIndex
CREATE INDEX "EnergyRecord_period_idx" ON "EnergyRecord"("period");

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyRecord" ADD CONSTRAINT "EnergyRecord_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
