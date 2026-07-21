import { prisma } from "@/lib/prisma"
import { isRestDay } from "@/lib/work-schedule"
import { computeScheduleDeviation, ScheduleDeviation } from "@/lib/schedule-tolerance"

interface PreviewPunchUseCaseRequest {
    userId: string
    type: string
    timestamp?: Date
}

export interface PreviewPunchUseCaseResponse {
    isExtraOnRestDay: boolean
    scheduleDeviation: ScheduleDeviation | null
}

/**
 * Decide, com a config mais atual do colaborador e o relógio do servidor, o que uma
 * batida vai gerar: hora extra em dia de folga e/ou desvio da janela de 15min.
 * É consultado pelo app ANTES de registrar (GET /punch-preview), para abrir o modal
 * de justificativa certo, e reutilizado pelo CreateTimeRecordUseCase na gravação —
 * garantindo que app e servidor nunca discordem sobre a mesma regra.
 */
export class PreviewPunchUseCase {
    async execute({ userId, type, timestamp }: PreviewPunchUseCaseRequest): Promise<PreviewPunchUseCaseResponse> {
        const now = timestamp ?? new Date()
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { work_scale: true, work_start_date: true, entry_time: true, exit_time: true },
        })

        const isExtraOnRestDay = isRestDay(user?.work_scale, now, user?.work_start_date ?? null)

        // Vigia não segue horário fixo; em dia de folga a batida já vira pendência de
        // hora extra — nos dois casos a régua de tolerância não se aplica.
        const scheduleDeviation = user?.work_scale === 'vigia' || isExtraOnRestDay
            ? null
            : computeScheduleDeviation({
                type,
                timestamp: now,
                entryTime: user?.entry_time,
                exitTime: user?.exit_time,
            })

        return { isExtraOnRestDay, scheduleDeviation }
    }
}
