import { RouteLog, Prisma } from "@prisma/client"

export interface IRouteLogsRepository {
    create(data: Prisma.RouteLogUncheckedCreateInput): Promise<RouteLog>
    findById(id: string): Promise<RouteLog | null>
    findManyByUserId(userId: string, fromDate: Date, toDate: Date): Promise<RouteLog[]>
    save(routeLog: RouteLog): Promise<RouteLog>
}

