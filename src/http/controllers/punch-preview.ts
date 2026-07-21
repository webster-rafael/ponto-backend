import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PreviewPunchUseCase } from "@/use-cases/preview-punch"

export async function punchPreview(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
        userId: z.string().uuid(),
        type: z.enum(['entrada', 'almoco_saida', 'almoco_volta', 'saida']),
    })

    const { userId, type } = querySchema.parse(request.query)

    const previewPunchUseCase = new PreviewPunchUseCase()
    const result = await previewPunchUseCase.execute({ userId, type })

    return reply.status(200).send(result)
}
