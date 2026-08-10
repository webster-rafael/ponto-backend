import { prisma } from "@/lib/prisma"
import { ManualPunchRequest } from "@prisma/client"

interface CreateManualPunchRequestUseCaseRequest {
    userId: string
    type: string
    requestedTimestamp: Date
    justification: string
}

interface CreateManualPunchRequestUseCaseResponse {
    manualPunchRequest: ManualPunchRequest
}

/**
 * Colaborador registra um ponto retroativo (esqueceu de bater), pendente de revisão
 * do RH. Modelo dedicado (ManualPunchRequest) — nunca vira um TimeRecord de verdade
 * até ser aprovado (ver ApproveManualPunchRequestUseCase), e nunca reaproveita os
 * campos de geofence/hora-extra-em-folga (is_out_of_range/out_of_range_status).
 */
export class CreateManualPunchRequestUseCase {
    async execute({
        userId,
        type,
        requestedTimestamp,
        justification,
    }: CreateManualPunchRequestUseCaseRequest): Promise<CreateManualPunchRequestUseCaseResponse> {
        const manualPunchRequest = await prisma.manualPunchRequest.create({
            data: {
                user_id: userId,
                type,
                requested_timestamp: requestedTimestamp,
                justification,
            },
        })

        return { manualPunchRequest }
    }
}
