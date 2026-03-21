import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchUserTimeRecordsUseCase } from "@/use-cases/fetch-user-time-records"
import { PrismaTimeRecordsRepository } from "@/repositories/prisma/prisma-time-records-repository"

export async function fetchUserTimeRecords(request: FastifyRequest, reply: FastifyReply) {
    const fetchUserTimeRecordsQuerySchema = z.object({
        userId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })

    const { userId, date, fromDate, toDate } = fetchUserTimeRecordsQuerySchema.parse(request.query)

    try {
        const timeRecordsRepository = new PrismaTimeRecordsRepository()
        const fetchUserTimeRecordsUseCase = new FetchUserTimeRecordsUseCase(timeRecordsRepository)

        const { timeRecords } = await fetchUserTimeRecordsUseCase.execute({
            userId,
            date,
            fromDate,
            toDate
        })

        return reply.status(200).send(timeRecords)

    } catch (err) {
        throw err
    }
}
