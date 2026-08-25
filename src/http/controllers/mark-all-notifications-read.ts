import { FastifyReply, FastifyRequest } from "fastify"
import { MarkAllNotificationsReadUseCase } from "@/use-cases/mark-all-notifications-read"

export async function markAllNotificationsRead(request: FastifyRequest, reply: FastifyReply) {
    const { sub: userId } = request.user

    const markAllNotificationsReadUseCase = new MarkAllNotificationsReadUseCase()
    const { count } = await markAllNotificationsReadUseCase.execute({ userId })

    return reply.status(200).send({ count })
}
