import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchActiveShiftUseCase } from "@/use-cases/fetch-active-shift"
import { PrismaTimeRecordsRepository } from "@/repositories/prisma/prisma-time-records-repository"

export async function fetchActiveShift(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
        userId: z.string().uuid(),
    })

    const { userId } = querySchema.parse(request.query)

    const timeRecordsRepository = new PrismaTimeRecordsRepository()
    const fetchActiveShiftUseCase = new FetchActiveShiftUseCase(timeRecordsRepository)

    const { records, hasOpenShift } = await fetchActiveShiftUseCase.execute({ userId })

    return reply.status(200).send({ records, hasOpenShift })
}
