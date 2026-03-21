import { IRouteLogsRepository } from "../repositories/route-logs-repository"
import { RouteLog } from "@prisma/client"

interface StopRouteLogUseCaseRequest {
    userId: string
    latitude: number | null
    longitude: number | null
    timestamp: Date
}

interface StopRouteLogUseCaseResponse {
    routeLog: RouteLog
}

export class StopRouteLogUseCase {
    constructor(private routeLogsRepository: IRouteLogsRepository) { }

    async execute({
        userId,
        latitude,
        longitude,
        timestamp
    }: StopRouteLogUseCaseRequest): Promise<StopRouteLogUseCaseResponse> {
        const routeLog = await this.routeLogsRepository.findLatestOpen(userId)

        if (!routeLog) {
            throw new Error("Route Log not found")
        }

        if (routeLog.end_timestamp) {
            throw new Error("Route Log already stopped")
        }

        routeLog.end_latitude = latitude
        routeLog.end_longitude = longitude
        routeLog.end_timestamp = timestamp

        const updatedRouteLog = await this.routeLogsRepository.save(routeLog)

        return {
            routeLog: updatedRouteLog,
        }
    }
}
