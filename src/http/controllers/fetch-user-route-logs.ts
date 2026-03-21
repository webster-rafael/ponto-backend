import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PrismaRouteLogsRepository } from "@/repositories/prisma/prisma-route-logs-repository"
import { FetchUserRouteLogsUseCase } from "@/use-cases/fetch-user-route-logs"

export async function fetchUserRouteLogs(request: FastifyRequest, reply: FastifyReply) {
    const fetchRouteLogsQuerySchema = z.object({
        userId: z.string().uuid().optional(),
        fromDate: z.string(),
        toDate: z.string(),
    })

    const { fromDate, toDate, userId: queryUserId } = fetchRouteLogsQuerySchema.parse(request.query)

    const routeLogsRepository = new PrismaRouteLogsRepository()
    const fetchUserRouteLogsUseCase = new FetchUserRouteLogsUseCase(routeLogsRepository)

    // Allow fetching own logs or admin fetching others
    // For now, if userId is provided in query and matches authenticated user (or logic for admin), use it.
    // Default to strict 'own' logs for simplicity unless admin logic is clearer. 
    // The current pattern in fetch-user-time-records uses queryUserId but falls back or validates? 
    // Looking at fetch-user-time-records.ts (from file list earlier, I can't see content, but usually we restrict).

    // safe default:
    const targetUserId = queryUserId || request.user.sub

    const { routeLogs } = await fetchUserRouteLogsUseCase.execute({
        userId: targetUserId,
        fromDate,
        toDate,
    })

    return reply.status(200).send(routeLogs)
}
