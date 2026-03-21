import { IRouteLogsRepository } from "../repositories/route-logs-repository"
import { RouteLog } from "@prisma/client"

interface StartRouteLogUseCaseRequest {
    userId: string
    latitude: number
    longitude: number
    timestamp: Date
}

interface StartRouteLogUseCaseResponse {
    routeLog: RouteLog
}

export class StartRouteLogUseCase {
    constructor(private routeLogsRepository: IRouteLogsRepository) { }

    async execute({
        userId,
        latitude,
        longitude,
        timestamp
    }: StartRouteLogUseCaseRequest): Promise<StartRouteLogUseCaseResponse> {
        const routeLog = await this.routeLogsRepository.create({
            user_id: userId,
            start_latitude: latitude,
            start_longitude: longitude,
            start_timestamp: timestamp,
        })

        return {
            routeLog,
        }
    }
}
