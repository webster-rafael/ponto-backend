import { prisma } from "@/lib/prisma"
import { notifyUser } from "@/lib/notify-user"
import { Justification, JustificationStatus } from "@prisma/client"

interface UpdateJustificationStatusRequest {
    justificationId: string
    status: JustificationStatus
    reason?: string | null
}

interface UpdateJustificationStatusResponse {
    justification: Justification
}

export class UpdateJustificationStatusUseCase {
    async execute({
        justificationId,
        status,
        reason
    }: UpdateJustificationStatusRequest): Promise<UpdateJustificationStatusResponse> {

        const justification = await prisma.justification.update({
            where: { id: justificationId },
            data: {
                status,
                reason: status === 'REJECTED' ? reason : null,
            },
        })

        if (status === 'APPROVED') {
            const user = await prisma.user.findUnique({ where: { id: justification.user_id } })
            if (user) {
                notifyUser({
                    userId: user.id,
                    pushToken: user.push_token,
                    title: "Justificativa aprovada ✓",
                    body: "Sua justificativa de falta foi aprovada pelo RH.",
                    data: { type: "justification_approved", justificationId },
                })
            }
        }

        return { justification }
    }
}
