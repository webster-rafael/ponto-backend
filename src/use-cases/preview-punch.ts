import { prisma } from "@/lib/prisma"
import { evaluatePunch } from "@/lib/ponto-engine/punch-engine"
import { PunchType } from "@/lib/ponto-engine/scale-config"
import { Deviation } from "@/lib/ponto-engine/schedule-window"
import { ShiftRecord } from "@/lib/ponto-engine/shift-grouping"

interface PreviewPunchUseCaseRequest {
    userId: string
    type: string
    timestamp?: Date
}

export interface PreviewPunchUseCaseResponse {
    isExtraOnRestDay: boolean
    scheduleDeviation: Deviation | null
    usedPunchTypes: PunchType[]
    expectedNextType: PunchType | null
    overtimePreview: { minutes: number } | null
}

// Janela de registros recentes usada pra reconstruir os turnos do colaborador — 30
// dias, não só 24x48h: alguns turnos ficam abertos por dias de propósito (ex: vigia
// em viagem, só bate a saída depois de 2-3 dias) e o motor precisa achar a entrada
// de abertura pra saber quando o turno realmente começou.
const RECENT_RECORDS_WINDOW_HOURS = 24 * 30

/**
 * Decide, com a config mais atual do colaborador e o relógio do servidor, o que uma
 * batida vai gerar: hora extra em dia de folga, desvio da janela de 15min (agora
 * também no almoço, e ciente de turnos que atravessam a meia-noite), quais tipos já
 * foram batidos no turno aberto, e prévia de hora extra por carga horária. É
 * consultado pelo app ANTES de registrar (GET /punch-preview), para abrir o modal de
 * justificativa certo, e reutilizado pelo CreateTimeRecordUseCase na gravação —
 * garantindo que app e servidor nunca discordem sobre a mesma regra.
 */
export class PreviewPunchUseCase {
    async execute({ userId, type, timestamp }: PreviewPunchUseCaseRequest): Promise<PreviewPunchUseCaseResponse> {
        const now = timestamp ?? new Date()
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                work_scale: true,
                work_start_date: true,
                entry_time: true,
                lunch_start: true,
                lunch_end: true,
                exit_time: true,
                does_overtime: true,
            },
        })

        const since = new Date(now.getTime() - RECENT_RECORDS_WINDOW_HOURS * 60 * 60 * 1000)
        const recentRecords: ShiftRecord[] = (
            await prisma.timeRecord.findMany({
                where: { user_id: userId, timestamp: { gte: since, lte: now } },
                orderBy: { timestamp: "asc" },
            })
        ).map(r => ({ id: r.id, type: r.type, timestamp: r.timestamp }))

        const result = evaluatePunch({
            punchType: type as PunchType,
            timestamp: now,
            recentRecords,
            config: {
                workScale: user?.work_scale,
                workStartDate: user?.work_start_date,
                entryTime: user?.entry_time,
                lunchStart: user?.lunch_start,
                lunchEnd: user?.lunch_end,
                exitTime: user?.exit_time,
                doesOvertime: user?.does_overtime ?? false,
            },
        })

        return {
            isExtraOnRestDay: result.isRestDay,
            scheduleDeviation: result.scheduleDeviation,
            usedPunchTypes: result.usedPunchTypes,
            expectedNextType: result.expectedNextType,
            overtimePreview: result.overtimePreview,
        }
    }
}
