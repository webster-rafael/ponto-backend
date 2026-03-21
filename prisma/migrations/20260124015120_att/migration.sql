/*
  Warnings:

  - You are about to drop the column `timestamp` on the `patrol_checkins` table. All the data in the column will be lost.
  - Added the required column `start_timestamp` to the `patrol_checkins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."patrol_checkins" DROP COLUMN "timestamp",
ADD COLUMN     "start_timestamp" TIMESTAMP(3) NOT NULL;
