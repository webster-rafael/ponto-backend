import { prisma } from "@/lib/prisma"
import { notifyUser } from "@/lib/notify-user"
import { CreateTimeRecordUseCase } from "@/use-cases/create-time-record"
import { PrismaTimeRecordsRepository } from "@/repositories/prisma/prisma-time-records-repository"
import { ManualPunchRequest } from "@prisma/client"

interface ApproveManualPunchRequestUseCaseRequest {
    manualPunchRequest: ManualPunchRequest
    reviewedBy?: string
}

interface ApproveManualPunchRequestUseCaseResponse {
    manualPunchRequest: ManualPunchRequest
}

/**
 * RH aprova um registro manual: gera o TimeRecord de verdade passando pelo MESMO
 * motor/use-case de qualquer outra batida (CreateTimeRecordUseCase), com o timestamp
 * retroativo que o colaborador informou — garante que um ponto aprovado por essa via
 * fica 100% consistente com o resto do sistema (turnos, tolerância, hora extra),
 * nunca um insert cru desconectado das mesmas regras.
 */
export class ApproveManualPunchRequestUseCase {
    async execute({
        manualPunchRequest,
        reviewedBy,
    }: ApproveManualPunchRequestUseCaseRequest): Promise<ApproveManualPunchRequestUseCaseResponse> {
        const timeRecordsRepository = new PrismaTimeRecordsRepository()
        const createTimeRecordUseCase = new CreateTimeRecordUseCase(timeRecordsRepository)

        const { timeRecord } = await createTimeRecordUseCase.execute({
            userId: manualPunchRequest.user_id,
            type: manualPunchRequest.type,
            overrideTimestamp: manualPunchRequest.requested_timestamp,
            sourceManualRequestId: manualPunchRequest.id,
            // A justificativa que o colaborador já deu ao pedir o registro manual serve
            // também como justificativa de hora extra, se o turno retroativo gerar uma —
            // não faz sentido pedir um segundo texto pro RH nessa aprovação.
            overtimeJustificationReason: manualPunchRequest.justification,
        })

        const updated = await prisma.manualPunchRequest.update({
            where: { id: manualPunchRequest.id },
            data: {
                status: "APPROVED",
                reviewed_by: reviewedBy,
                reviewed_at: new Date(),
                created_time_record_id: timeRecord.id,
            },
        })

        const user = await prisma.user.findUnique({ where: { id: manualPunchRequest.user_id } })
        if (user) {
            notifyUser({
                userId: user.id,
                pushToken: user.push_token,
                title: "Registro manual aprovado ✓",
                body: "Seu ponto retroativo foi aprovado pelo RH.",
                data: { type: "manual_punch_approved", manualPunchRequestId: manualPunchRequest.id },
            })
        }

        return { manualPunchRequest: updated }
    }
}
