import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchUserManualPunchRequestsUseCase } from "@/use-cases/fetch-user-manual-punch-requests"

export async function fetchUserManualPunchRequests(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({ userId: z.string().uuid() })
    const { userId } = querySchema.parse(request.query)

    const useCase = new FetchUserManualPunchRequestsUseCase()
    const { manualPunchRequests } = await useCase.execute({ userId })

    return reply.status(200).send(manualPunchRequests)
}
