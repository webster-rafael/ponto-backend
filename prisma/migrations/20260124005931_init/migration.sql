-- CreateTable
CREATE TABLE "public"."route_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_timestamp" TIMESTAMP(3) NOT NULL,
    "start_latitude" DOUBLE PRECISION NOT NULL,
    "start_longitude" DOUBLE PRECISION NOT NULL,
    "end_timestamp" TIMESTAMP(3),
    "end_latitude" DOUBLE PRECISION,
    "end_longitude" DOUBLE PRECISION,

    CONSTRAINT "route_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patrol_points" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrol_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patrol_checkins" (
    "id" TEXT NOT NULL,
    "patrol_point_id" TEXT NOT NULL,
    "start_timestamp" TIMESTAMP(3) NOT NULL,
    "end_timestamp" TIMESTAMP(3),
    "duration_seconds" INTEGER,

    CONSTRAINT "patrol_checkins_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."route_logs" ADD CONSTRAINT "route_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patrol_points" ADD CONSTRAINT "patrol_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patrol_checkins" ADD CONSTRAINT "patrol_checkins_patrol_point_id_fkey" FOREIGN KEY ("patrol_point_id") REFERENCES "public"."patrol_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
