import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchAttendanceSummaryBatchUseCase } from "@/use-cases/fetch-attendance-summary-batch"

// Versão pro colaborador (mobile) do endpoint em lote usado pelo dashboard — mesma
// engine, mas autenticado por JWT e sempre restrito ao próprio usuário (nunca aceita
// um userId de fora), diferente do /attendance-summary/batch (RH, chave interna, N
// colaboradores). O app nunca pode carregar a chave interna no bundle — qualquer
// pessoa extrairia do binário e enxergaria dado de qualquer colaborador.
export async function fetchAttendanceSummary(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })

    const { fromDate, toDate } = querySchema.parse(request.query)
    const userId = request.user.sub

    const useCase = new FetchAttendanceSummaryBatchUseCase()
    const { summaries } = await useCase.execute({ userIds: [userId], fromDate, toDate })

    return reply.status(200).send({ days: summaries[0]?.days ?? [] })
}
