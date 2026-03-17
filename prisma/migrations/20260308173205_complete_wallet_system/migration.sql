/*
  Warnings:

  - You are about to drop the column `paymentId` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `wallet_transactions` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'NG_WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE 'ORANGE_MONEY';
ALTER TYPE "PaymentMethod" ADD VALUE 'MTN_MONEY';

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "reference" DROP NOT NULL;

-- AlterTable
ALTER TABLE "wallet_transactions" DROP COLUMN "paymentId",
DROP COLUMN "sessionId",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'GNF',
ALTER COLUMN "balance" SET DEFAULT 200000;

-- CreateIndex
CREATE INDEX "wallet_transactions_reference_idx" ON "wallet_transactions"("reference");
