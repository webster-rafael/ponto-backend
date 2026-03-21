import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PrismaRouteLogsRepository } from "@/repositories/prisma/prisma-route-logs-repository"
import { StopRouteLogUseCase } from "@/use-cases/stop-route-log"

export async function stopRoute(request: FastifyRequest, reply: FastifyReply) {
    const stopRouteBodySchema = z.object({
        routeLogId: z.string().uuid().nullable().optional(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        timestamp: z.string(),
    })

    const { routeLogId, latitude, longitude, timestamp } = stopRouteBodySchema.parse(request.body)

    const routeLogsRepository = new PrismaRouteLogsRepository()
    const stopRouteLogUseCase = new StopRouteLogUseCase(routeLogsRepository)

    const { routeLog } = await stopRouteLogUseCase.execute({
        routeLogId,
        userId: request.user.sub,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        timestamp: new Date(timestamp),
    })

    return reply.status(200).send(routeLog)
}
