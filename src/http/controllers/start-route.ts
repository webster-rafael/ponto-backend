import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PrismaRouteLogsRepository } from "@/repositories/prisma/prisma-route-logs-repository"
import { StartRouteLogUseCase } from "@/use-cases/start-route-log"

export async function startRoute(request: FastifyRequest, reply: FastifyReply) {
    const startRouteBodySchema = z.object({
        latitude: z.number(),
        longitude: z.number(),
        timestamp: z.string(), // Usually comes as string from JSON
    })

    try {
        const { latitude, longitude, timestamp } = startRouteBodySchema.parse(request.body)

        const routeLogsRepository = new PrismaRouteLogsRepository()
        const startRouteLogUseCase = new StartRouteLogUseCase(routeLogsRepository)

        // Request.user is populated by verifyJwt middleware
        const userId = request.user.sub

        const { routeLog } = await startRouteLogUseCase.execute({
            userId,
            latitude,
            longitude,
            timestamp: new Date(timestamp),
        })

        return reply.status(201).send(routeLog)
    } catch (err) {
        console.error('❌ Error starting route:', err)
        return reply.status(500).send({ message: 'Internal Server Error', error: err })
    }
}
