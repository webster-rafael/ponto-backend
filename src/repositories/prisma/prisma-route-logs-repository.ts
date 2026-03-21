import { prisma } from "@/lib/prisma"
import { IRouteLogsRepository } from "../route-logs-repository"
import { RouteLog, Prisma } from "@prisma/client"

export class PrismaRouteLogsRepository implements IRouteLogsRepository {
    async create(data: Prisma.RouteLogUncheckedCreateInput) {
        const routeLog = await prisma.routeLog.create({
            data,
        })
        return routeLog
    }

    async findById(id: string) {
        const routeLog = await prisma.routeLog.findUnique({
            where: {
                id,
            },
        })
        return routeLog
    }

    async findManyByUserId(userId: string, fromDate: Date, toDate: Date) {
        const routeLogs = await prisma.routeLog.findMany({
            where: {
                user_id: userId,
                start_timestamp: {
                    gte: fromDate,
                    lte: toDate,
                }
            },
            orderBy: {
                start_timestamp: 'desc'
            }
        })
        return routeLogs
    }

    async save(routeLog: RouteLog) {
        // Prisma updates usually take data, not the whole object as data if we want partial updates.
        // But here we are passing the whole object which matches the type.
        // However, we should be careful about which fields we are updating.

        const updatedRouteLog = await prisma.routeLog.update({
            where: {
                id: routeLog.id,
            },
            data: {
                end_latitude: routeLog.end_latitude,
                end_longitude: routeLog.end_longitude,
                end_timestamp: routeLog.end_timestamp,
            },
        })
        return updatedRouteLog
    }
}
