import { prisma } from "@/lib/prisma"

interface MarkNotificationReadRequest {
    notificationId: string
    userId: string
}

interface MarkNotificationReadResponse {
    success: boolean
}

export class MarkNotificationReadUseCase {
    async execute({ notificationId, userId }: MarkNotificationReadRequest): Promise<MarkNotificationReadResponse> {
        // updateMany (não update) porque o filtro já inclui user_id — evita marcar
        // como lida uma notificação de outro colaborador só porque adivinhou o id.
        const result = await prisma.notification.updateMany({
            where: { id: notificationId, user_id: userId },
            data: { read: true },
        })

        return { success: result.count > 0 }
    }
}
