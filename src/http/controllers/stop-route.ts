import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PrismaRouteLogsRepository } from "@/repositories/prisma/prisma-route-logs-repository"
import { StopRouteLogUseCase } from "@/use-cases/stop-route-log"

export async function stopRoute(request: FastifyRequest, reply: FastifyReply) {
    console.log('🛑 stopRoute called | userId:', request.user?.sub, '| body:', JSON.stringify(request.body))
    const stopRouteBodySchema = z.object({
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        timestamp: z.string().optional(),
    })

    const { latitude, longitude, timestamp } = stopRouteBodySchema.parse(request.body)

    const routeLogsRepository = new PrismaRouteLogsRepository()
    const stopRouteLogUseCase = new StopRouteLogUseCase(routeLogsRepository)

    try {
        const { routeLog } = await stopRouteLogUseCase.execute({
            userId: request.user.sub,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        })
        return reply.status(200).send(routeLog)
    } catch (err: any) {
        return reply.status(400).send({ message: err.message || 'Error stopping route' })
    }
}
