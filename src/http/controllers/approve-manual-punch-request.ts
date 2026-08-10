import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApproveManualPunchRequestUseCase } from "@/use-cases/approve-manual-punch-request"

export async function approveManualPunchRequest(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { id } = paramsSchema.parse(request.params)

    const manualPunchRequest = await prisma.manualPunchRequest.findUnique({ where: { id } })

    if (!manualPunchRequest) {
        return reply.status(404).send({ message: "Solicitação não encontrada." })
    }

    if (manualPunchRequest.status !== "PENDING") {
        return reply.status(400).send({ message: "Esta solicitação já foi revisada." })
    }

    const useCase = new ApproveManualPunchRequestUseCase()
    const { manualPunchRequest: updated } = await useCase.execute({ manualPunchRequest })

    return reply.status(200).send(updated)
}
