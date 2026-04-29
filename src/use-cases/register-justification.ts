
import { prisma } from "@/lib/prisma"

interface RegisterJustificationUseCaseRequest {
    userId: string
    date: Date
    fileUrl: string
    description?: string
}

export class RegisterJustificationUseCase {
    async execute({ userId, date, fileUrl, description }: RegisterJustificationUseCaseRequest) {
        const justification = await prisma.justification.create({
            data: {
                user_id: userId,
                date,
                file_url: fileUrl,
                reason: description,
            },
        })

        return {
            justification,
        }
    }
}
