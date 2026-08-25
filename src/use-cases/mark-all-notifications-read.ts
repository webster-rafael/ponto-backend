import { prisma } from "@/lib/prisma"

interface MarkAllNotificationsReadRequest {
    userId: string
}

interface MarkAllNotificationsReadResponse {
    count: number
}

export class MarkAllNotificationsReadUseCase {
    async execute({ userId }: MarkAllNotificationsReadRequest): Promise<MarkAllNotificationsReadResponse> {
        const result = await prisma.notification.updateMany({
            where: { user_id: userId, read: false },
            data: { read: true },
        })

        return { count: result.count }
    }
}
