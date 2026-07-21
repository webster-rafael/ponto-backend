import { prisma } from "@/lib/prisma"
import { isRestDay } from "@/lib/work-schedule"
import { computeScheduleDeviation, ScheduleDeviation } from "@/lib/schedule-tolerance"

interface PreviewPunchUseCaseRequest {
    userId: string
    type: string
    timestamp?: Date
}

// Limites do dia calendário em Cuiabá (UTC-4), como intervalo em UTC — mesmo offset
// fixo usado em work-schedule.ts e schedule-tolerance.ts.
function cuiabaDayBoundsUtc(date: Date): { start: Date; end: Date } {
    const cuiaba = new Date(date.getTime() - 4 * 60 * 60 * 1000)
    const y = cuiaba.getUTCFullYear()
    const m = cuiaba.getUTCMonth()
    const d = cuiaba.getUTCDate()
    return {
        start: new Date(Date.UTC(y, m, d, 4, 0, 0, 0)),
        end: new Date(Date.UTC(y, m, d + 1, 4, 0, 0, 0)),
    }
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

        let isFirstEntradaOfDay = true
        if (type === "entrada") {
            const { start, end } = cuiabaDayBoundsUtc(now)
            const previousEntrada = await prisma.timeRecord.findFirst({
                where: { user_id: userId, type: "entrada", timestamp: { gte: start, lt: end } },
            })
            isFirstEntradaOfDay = !previousEntrada
        }

        // Vigia não segue horário fixo; em dia de folga a batida já vira pendência de
        // hora extra — nos dois casos a régua de tolerância não se aplica.
        const scheduleDeviation = user?.work_scale === 'vigia' || isExtraOnRestDay
            ? null
            : computeScheduleDeviation({
                type,
                timestamp: now,
                entryTime: user?.entry_time,
                exitTime: user?.exit_time,
                isFirstEntradaOfDay,
            })

        return { isExtraOnRestDay, scheduleDeviation }
    }
}
