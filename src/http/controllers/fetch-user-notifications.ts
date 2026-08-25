import { FastifyReply, FastifyRequest } from "fastify"
import { FetchUserNotificationsUseCase } from "@/use-cases/fetch-user-notifications"

export async function fetchUserNotifications(request: FastifyRequest, reply: FastifyReply) {
    const { sub: userId } = request.user

    const fetchUserNotificationsUseCase = new FetchUserNotificationsUseCase()
    const { notifications, unreadCount } = await fetchUserNotificationsUseCase.execute({ userId })

    return reply.status(200).send({ notifications, unreadCount })
}
