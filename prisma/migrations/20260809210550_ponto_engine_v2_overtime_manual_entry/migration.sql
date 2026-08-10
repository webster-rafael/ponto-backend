-- AlterTable
ALTER TABLE "public"."time_records" ADD COLUMN     "overtime_justification_reason" TEXT,
ADD COLUMN     "overtime_justification_status" TEXT,
ADD COLUMN     "overtime_minutes" INTEGER,
ADD COLUMN     "requires_overtime_justification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source_manual_request_id" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "does_overtime" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."manual_punch_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requested_timestamp" TIMESTAMP(3) NOT NULL,
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_time_record_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_punch_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."manual_punch_requests" ADD CONSTRAINT "manual_punch_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

