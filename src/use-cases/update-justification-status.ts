import { prisma } from "@/lib/prisma"
import { sendPush } from "@/lib/send-push"
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
            if (user?.push_token) {
                sendPush(
                    user.push_token,
                    "Justificativa aprovada ✓",
                    "Sua justificativa de falta foi aprovada pelo RH.",
                    { type: "justification_approved", justificationId }
                )
            }
        }

        return { justification }
    }
}
