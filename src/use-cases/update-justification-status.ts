import { prisma } from "@/lib/prisma"
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
            where: {
                id: justificationId,
            },
            data: {
                status,
                reason: status === 'REJECTED' ? reason : null, // Only save reason if rejected, or maybe always save? User said "if RH reproves, put description".
            }
        })

        return {
            justification,
        }
    }
}
