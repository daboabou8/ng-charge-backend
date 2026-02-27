-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
