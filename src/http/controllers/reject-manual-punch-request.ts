import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { RejectManualPunchRequestUseCase } from "@/use-cases/reject-manual-punch-request"

export async function rejectManualPunchRequest(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({ reason: z.string().optional() })

    const { id } = paramsSchema.parse(request.params)
    const { reason } = bodySchema.parse(request.body ?? {})

    const manualPunchRequest = await prisma.manualPunchRequest.findUnique({ where: { id } })

    if (!manualPunchRequest) {
        return reply.status(404).send({ message: "Solicitação não encontrada." })
    }

    if (manualPunchRequest.status !== "PENDING") {
        return reply.status(400).send({ message: "Esta solicitação já foi revisada." })
    }

    const useCase = new RejectManualPunchRequestUseCase()
    const { manualPunchRequest: updated } = await useCase.execute({ manualPunchRequest, reason })

    return reply.status(200).send(updated)
}
