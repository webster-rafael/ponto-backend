import { prisma } from "@/lib/prisma"
import { Justification } from "@prisma/client"

interface FetchUserJustificationsRequest {
    userId: string
}

interface FetchUserJustificationsResponse {
    justifications: Justification[]
}

export class FetchUserJustificationsUseCase {
    async execute({
        userId,
    }: FetchUserJustificationsRequest): Promise<FetchUserJustificationsResponse> {
        const justifications = await prisma.justification.findMany({
            where: {
                user_id: userId,
            },
            orderBy: {
                date: 'desc',
            }
        })

        return {
            justifications,
        }
    }
}
