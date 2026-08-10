import { prisma } from "@/lib/prisma"
import { sendPush } from "@/lib/send-push"
import { ManualPunchRequest } from "@prisma/client"

interface RejectManualPunchRequestUseCaseRequest {
    manualPunchRequest: ManualPunchRequest
    reviewedBy?: string
    reason?: string
}

interface RejectManualPunchRequestUseCaseResponse {
    manualPunchRequest: ManualPunchRequest
}

export class RejectManualPunchRequestUseCase {
    async execute({
        manualPunchRequest,
        reviewedBy,
        reason,
    }: RejectManualPunchRequestUseCaseRequest): Promise<RejectManualPunchRequestUseCaseResponse> {
        const updated = await prisma.manualPunchRequest.update({
            where: { id: manualPunchRequest.id },
            data: {
                status: "REJECTED",
                rejection_reason: reason,
                reviewed_by: reviewedBy,
                reviewed_at: new Date(),
            },
        })

        const user = await prisma.user.findUnique({ where: { id: manualPunchRequest.user_id } })
        if (user?.push_token) {
            sendPush(
                user.push_token,
                "Registro manual rejeitado",
                reason ? `Seu ponto retroativo foi rejeitado: ${reason}` : "Seu ponto retroativo foi rejeitado pelo RH.",
                { type: "manual_punch_rejected", manualPunchRequestId: manualPunchRequest.id }
            )
        }

        return { manualPunchRequest: updated }
    }
}
