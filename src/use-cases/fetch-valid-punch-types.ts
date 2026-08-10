import { prisma } from "@/lib/prisma"
import { evaluatePunch } from "@/lib/ponto-engine/punch-engine"
import { PunchType } from "@/lib/ponto-engine/scale-config"
import { ShiftRecord } from "@/lib/ponto-engine/shift-grouping"

interface FetchValidPunchTypesUseCaseRequest {
    userId: string
}

export interface FetchValidPunchTypesUseCaseResponse {
    usedPunchTypes: PunchType[]
    expectedNextType: PunchType | null
    restDayPunchBlocked: boolean
}

// Mesma janela generosa de preview-punch.ts — turnos podem ficar abertos por dias
// de propósito (ex: vigia em viagem).
const RECENT_RECORDS_WINDOW_HOURS = 24 * 30

/**
 * Versão leve do PreviewPunchUseCase: só diz quais tipos já foram batidos no turno
 * aberto (pro modal de 4 opções escurecer os botões) e qual o próximo esperado (pro
 * aviso de ordem) — sem exigir um `type` de entrada, já que o app ainda não sabe qual
 * o colaborador vai escolher nesse momento.
 */
export class FetchValidPunchTypesUseCase {
    async execute({ userId }: FetchValidPunchTypesUseCaseRequest): Promise<FetchValidPunchTypesUseCaseResponse> {
        const now = new Date()
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                work_scale: true, work_start_date: true,
                entry_time: true, lunch_start: true, lunch_end: true, exit_time: true,
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

        // punchType é só um valor dummy pra satisfazer a assinatura de evaluatePunch —
        // usedPunchTypes/expectedNextType não dependem dele.
        const result = evaluatePunch({
            punchType: "entrada",
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
            usedPunchTypes: result.usedPunchTypes,
            expectedNextType: result.expectedNextType,
            restDayPunchBlocked: result.restDayPunchBlocked,
        }
    }
}
