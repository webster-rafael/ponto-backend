import { IRouteLogsRepository } from "../repositories/route-logs-repository"
import { RouteLog } from "@prisma/client"

interface FetchUserRouteLogsUseCaseRequest {
    userId: string
    fromDate: string // YYYY-MM-DD
    toDate: string   // YYYY-MM-DD
}

interface FetchUserRouteLogsUseCaseResponse {
    routeLogs: RouteLog[]
}

export class FetchUserRouteLogsUseCase {
    constructor(private routeLogsRepository: IRouteLogsRepository) { }

    async execute({
        userId,
        fromDate,
        toDate
    }: FetchUserRouteLogsUseCaseRequest): Promise<FetchUserRouteLogsUseCaseResponse> {
        // Create Date objects from YYYY-MM-DD strings in local time/boundary logic
        // We want to cover the whole day range.

        // Simple approach: parse as date and set times to 00:00:00 and 23:59:59
        // But since we are receiving params as strings, we can let the Date constructor handle it or use specific logic.
        // Assuming dates are YYYY-MM-DD. 

        const start = new Date(fromDate)
        start.setUTCHours(0, 0, 0, 0)

        const end = new Date(toDate)
        end.setUTCHours(23, 59, 59, 999)

        const routeLogs = await this.routeLogsRepository.findManyByUserId(
            userId,
            start,
            end
        )

        return {
            routeLogs,
        }
    }
}
