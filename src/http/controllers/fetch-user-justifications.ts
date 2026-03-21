import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchUserJustificationsUseCase } from "@/use-cases/fetch-user-justifications"

export async function fetchUserJustifications(request: FastifyRequest, reply: FastifyReply) {
    const fetchUserJustificationsUseCase = new FetchUserJustificationsUseCase()

    // Assuming the user is fetching their own justifications or we might filter by query param if needed. 
    // For now, let's look at how other controllers handle user ID. 
    // Usually via request.user.sub from JWT.

    const { sub: userId } = request.user

    const { justifications } = await fetchUserJustificationsUseCase.execute({
        userId,
    })

    return reply.status(200).send({
        justifications,
    })
}
