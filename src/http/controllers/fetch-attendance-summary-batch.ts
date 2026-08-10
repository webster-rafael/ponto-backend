import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchAttendanceSummaryBatchUseCase } from "@/use-cases/fetch-attendance-summary-batch"

export async function fetchAttendanceSummaryBatch(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
        userIds: z.array(z.string().uuid()).min(1),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })

    const { userIds, fromDate, toDate } = bodySchema.parse(request.body)

    const useCase = new FetchAttendanceSummaryBatchUseCase()
    const { summaries } = await useCase.execute({ userIds, fromDate, toDate })

    return reply.status(200).send({ summaries })
}
