-- AlterTable
ALTER TABLE "public"."time_records" ADD COLUMN "schedule_deviation_minutes" INTEGER,
ADD COLUMN "schedule_deviation_type" TEXT,
ADD COLUMN "requires_schedule_justification" BOOLEAN NOT NULL DEFAULT false;
