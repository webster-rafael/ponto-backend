import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { UpdateJustificationStatusUseCase } from "@/use-cases/update-justification-status"

export async function updateJustificationStatus(request: FastifyRequest, reply: FastifyReply) {
    const updateStatusBodySchema = z.object({
        status: z.enum(['APPROVED', 'REJECTED']),
        reason: z.string().optional(),
    })

    // We assume the ID comes from route params, e.g. /justifications/:id/status
    const updateStatusParamsSchema = z.object({
        id: z.string().uuid(),
    })

    const { id } = updateStatusParamsSchema.parse(request.params)
    const { status, reason } = updateStatusBodySchema.parse(request.body)

    if (status === 'REJECTED' && !reason) {
        return reply.status(400).send({ message: 'Reason is required when rejecting.' })
    }

    const updateJustificationStatusUseCase = new UpdateJustificationStatusUseCase()

    const { justification } = await updateJustificationStatusUseCase.execute({
        justificationId: id,
        status,
        reason,
    })

    return reply.status(200).send({
        justification,
    })
}
