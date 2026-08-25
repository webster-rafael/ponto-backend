import { prisma } from "@/lib/prisma"
import { Notification } from "@prisma/client"

interface FetchUserNotificationsRequest {
    userId: string
}

interface FetchUserNotificationsResponse {
    notifications: Notification[]
    unreadCount: number
}

const LIMIT = 100

export class FetchUserNotificationsUseCase {
    async execute({ userId }: FetchUserNotificationsRequest): Promise<FetchUserNotificationsResponse> {
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
                take: LIMIT,
            }),
            prisma.notification.count({
                where: { user_id: userId, read: false },
            }),
        ])

        return { notifications, unreadCount }
    }
}
