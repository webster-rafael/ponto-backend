
import { prisma } from "@/lib/prisma"

interface RegisterJustificationUseCaseRequest {
    userId: string
    date: Date
    fileUrl: string
}

export class RegisterJustificationUseCase {
    async execute({ userId, date, fileUrl }: RegisterJustificationUseCaseRequest) {
        const justification = await prisma.justification.create({
            data: {
                user_id: userId,
                date,
                file_url: fileUrl,
            },
        })

        return {
            justification,
        }
    }
}
