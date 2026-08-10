import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchValidPunchTypesUseCase } from "@/use-cases/fetch-valid-punch-types"

export async function fetchValidPunchTypes(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({ userId: z.string().uuid() })
    const { userId } = querySchema.parse(request.query)

    const useCase = new FetchValidPunchTypesUseCase()
    const result = await useCase.execute({ userId })

    return reply.status(200).send(result)
}
