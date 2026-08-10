import { prisma } from "@/lib/prisma"
import { buildDaySummaries, DaySummary } from "@/lib/ponto-engine/day-summary"

interface FetchAttendanceSummaryBatchUseCaseRequest {
    userIds: string[]
    fromDate: string // "YYYY-MM-DD" Cuiabá, inclusive
    toDate: string
}

export interface UserAttendanceSummary {
    userId: string
    days: DaySummary[]
}

interface FetchAttendanceSummaryBatchUseCaseResponse {
    summaries: UserAttendanceSummary[]
}

// Alguns turnos ficam abertos por dias de propósito (ex: vigia em viagem, só bate a
// saída depois de 2-3 dias) — o padding precisa ser generoso o bastante pra sempre
// incluir a entrada de abertura desses turnos na janela buscada, senão o motor não
// sabe quando o turno realmente começou. Mesmo valor que o sistema antigo já usava
// com segurança pra vigia no export individual.
const PADDING_DAYS = 30

/**
 * Resolve o resumo dia-a-dia de N colaboradores num intervalo, numa única passada —
 * usado pelo dashboard (export individual e Folha de Presença em lote) em vez de cada
 * um recalcular localmente. Substitui o cálculo que antes vivia só em
 * dashboard/src/lib/attendance-hours.ts, agora centralizado aqui (mesma engine que
 * decide tudo na hora da batida).
 */
export class FetchAttendanceSummaryBatchUseCase {
    async execute({ userIds, fromDate, toDate }: FetchAttendanceSummaryBatchUseCaseRequest): Promise<FetchAttendanceSummaryBatchUseCaseResponse> {
        const paddedFrom = new Date(`${fromDate}T00:00:00.000Z`)
        paddedFrom.setUTCDate(paddedFrom.getUTCDate() - PADDING_DAYS)
        const paddedTo = new Date(`${toDate}T00:00:00.000Z`)
        paddedTo.setUTCDate(paddedTo.getUTCDate() + PADDING_DAYS + 1)

        const [users, records, justifications] = await Promise.all([
            prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true, work_scale: true, work_start_date: true,
                    entry_time: true, lunch_start: true, lunch_end: true, exit_time: true,
                    does_overtime: true,
                },
            }),
            prisma.timeRecord.findMany({
                where: { user_id: { in: userIds }, timestamp: { gte: paddedFrom, lte: paddedTo } },
                orderBy: { timestamp: "asc" },
            }),
            prisma.justification.findMany({
                where: { user_id: { in: userIds }, date: { gte: paddedFrom, lte: paddedTo } },
            }),
        ])

        const recordsByUser = new Map<string, typeof records>()
        for (const r of records) {
            const list = recordsByUser.get(r.user_id) ?? []
            list.push(r)
            recordsByUser.set(r.user_id, list)
        }
        const justificationsByUser = new Map<string, typeof justifications>()
        for (const j of justifications) {
            const list = justificationsByUser.get(j.user_id) ?? []
            list.push(j)
            justificationsByUser.set(j.user_id, list)
        }

        const summaries: UserAttendanceSummary[] = users.map((user) => {
            const days = buildDaySummaries({
                fromDateKey: fromDate,
                toDateKey: toDate,
                records: (recordsByUser.get(user.id) ?? []).map((r) => ({
                    id: r.id,
                    type: r.type,
                    timestamp: r.timestamp,
                    is_out_of_range: r.is_out_of_range,
                    out_of_range_status: r.out_of_range_status,
                    out_of_range_reason: r.out_of_range_reason,
                    requires_schedule_justification: r.requires_schedule_justification,
                    schedule_deviation_minutes: r.schedule_deviation_minutes,
                    schedule_deviation_type: r.schedule_deviation_type,
                    requires_overtime_justification: r.requires_overtime_justification,
                    overtime_minutes: r.overtime_minutes,
                    overtime_justification_status: r.overtime_justification_status,
                })),
                justifications: (justificationsByUser.get(user.id) ?? []).map((j) => ({ date: j.date, status: j.status })),
                config: {
                    workScale: user.work_scale,
                    workStartDate: user.work_start_date,
                    entryTime: user.entry_time,
                    lunchStart: user.lunch_start,
                    lunchEnd: user.lunch_end,
                    exitTime: user.exit_time,
                    doesOvertime: user.does_overtime,
                },
            })

            return { userId: user.id, days }
        })

        return { summaries }
    }
}
