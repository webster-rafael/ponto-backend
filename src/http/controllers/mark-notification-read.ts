import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { MarkNotificationReadUseCase } from "@/use-cases/mark-notification-read"

export async function markNotificationRead(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { id } = paramsSchema.parse(request.params)
    const { sub: userId } = request.user

    const markNotificationReadUseCase = new MarkNotificationReadUseCase()
    const { success } = await markNotificationReadUseCase.execute({ notificationId: id, userId })

    if (!success) {
        return reply.status(404).send({ message: "Notificação não encontrada." })
    }

    return reply.status(200).send({ success: true })
}
