/*
  Warnings:

  - You are about to drop the column `start_timestamp` on the `patrol_checkins` table. All the data in the column will be lost.
  - Added the required column `timestamp` to the `patrol_checkins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."patrol_checkins" DROP COLUMN "start_timestamp",
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL;
