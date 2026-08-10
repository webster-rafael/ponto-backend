import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { CreateManualPunchRequestUseCase } from "@/use-cases/create-manual-punch-request"
import { InvalidPunchError } from "@/use-cases/errors/invalid-punch-error"

export async function createManualPunchRequest(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
        type: z.enum(["entrada", "almoco_saida", "almoco_volta", "saida"]),
        requestedTimestamp: z.coerce.date(),
        justification: z.string().trim().min(1),
    })

    const { type, requestedTimestamp, justification } = bodySchema.parse(request.body)

    if (requestedTimestamp.getTime() >= Date.now()) {
        throw new InvalidPunchError("O horário do registro manual precisa ser no passado.")
    }

    const userId = request.user.sub

    const createManualPunchRequestUseCase = new CreateManualPunchRequestUseCase()
    const { manualPunchRequest } = await createManualPunchRequestUseCase.execute({
        userId,
        type,
        requestedTimestamp,
        justification,
    })

    return reply.status(201).send(manualPunchRequest)
}
