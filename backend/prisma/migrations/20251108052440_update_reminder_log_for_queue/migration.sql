/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `ReminderLog` table. All the data in the column will be lost.
  - You are about to drop the column `reminderType` on the `ReminderLog` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[entityType,entityId,threshold]` on the table `ReminderLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fireAt` to the `ReminderLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `threshold` to the `ReminderLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ReminderLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."ReminderLog_entityType_entityId_reminderType_idx";

-- DropIndex
DROP INDEX "public"."ReminderLog_entityType_entityId_reminderType_key";

-- DropIndex
DROP INDEX "public"."ReminderLog_expiresAt_idx";

-- AlterTable
ALTER TABLE "ReminderLog" DROP COLUMN "expiresAt",
DROP COLUMN "reminderType",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fireAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "threshold" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "sentAt" DROP NOT NULL,
ALTER COLUMN "sentAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ReminderLog_entityType_entityId_threshold_idx" ON "ReminderLog"("entityType", "entityId", "threshold");

-- CreateIndex
CREATE INDEX "ReminderLog_fireAt_sentAt_idx" ON "ReminderLog"("fireAt", "sentAt");

-- CreateIndex
CREATE INDEX "ReminderLog_jobId_idx" ON "ReminderLog"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_entityType_entityId_threshold_key" ON "ReminderLog"("entityType", "entityId", "threshold");
