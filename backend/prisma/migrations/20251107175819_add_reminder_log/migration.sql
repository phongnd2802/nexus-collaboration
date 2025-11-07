-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderLog_entityType_entityId_reminderType_idx" ON "ReminderLog"("entityType", "entityId", "reminderType");

-- CreateIndex
CREATE INDEX "ReminderLog_expiresAt_idx" ON "ReminderLog"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_entityType_entityId_reminderType_key" ON "ReminderLog"("entityType", "entityId", "reminderType");
