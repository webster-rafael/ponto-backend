import { FastifyReply, FastifyRequest } from "fastify"
import { PrismaPatrolPointsRepository } from "@/repositories/prisma/prisma-patrol-points-repository"
import { FetchDailyPatrolPointsUseCase } from "@/use-cases/fetch-daily-patrol-points"
import { z } from "zod"

export async function fetchDailyPatrolPoints(request: FastifyRequest, reply: FastifyReply) {
    const fetchPointsQuerySchema = z.object({
        date: z.string().optional(), // YYYY-MM-DD
    })

    const { date } = fetchPointsQuerySchema.parse(request.query)

    const patrolPointsRepository = new PrismaPatrolPointsRepository()
    const fetchDailyPatrolPointsUseCase = new FetchDailyPatrolPointsUseCase(patrolPointsRepository)

    const userId = request.user.sub
    const queryDate = date ? new Date(date) : new Date()

    try {
        const { patrolPoints } = await fetchDailyPatrolPointsUseCase.execute({
            userId,
            date: queryDate
        })

        return reply.status(200).send(patrolPoints)
    } catch (err: any) {
        console.error('❌ Error fetching daily patrol points:', err)
        return reply.status(500).send({ message: 'Internal Server Error', debug: err.message, code: err.code })
    }
}
