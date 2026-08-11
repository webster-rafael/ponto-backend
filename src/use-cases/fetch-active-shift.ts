import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { prisma } from "@/lib/prisma"
import { TimeRecord } from "@prisma/client"
import { groupIntoShifts, findOpenShift, ShiftRecord } from "@/lib/ponto-engine/shift-grouping"
import { hasScheduledRestDayGap } from "@/lib/ponto-engine/rest-day"

interface FetchActiveShiftUseCaseRequest {
    userId: string
}

interface FetchActiveShiftUseCaseResponse {
    records: TimeRecord[]
    hasOpenShift: boolean
}

export class FetchActiveShiftUseCase {
    constructor(private timeRecordsRepository: ITimeRecordsRepository) { }

    async execute({ userId }: FetchActiveShiftUseCaseRequest): Promise<FetchActiveShiftUseCaseResponse> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { work_scale: true, work_start_date: true },
        })
        const config = { workScale: user?.work_scale, workStartDate: user?.work_start_date }

        // Mesma janela ampla do resto do motor (preview-punch.ts/fetch-valid-punch-types.ts)
        // pra qualquer escala, não só vigia — um turno esquecido (ex: saída não batida) só é
        // visível pro colaborador fechar se o app conseguir enxergar a entrada original, não
        // importa há quanto tempo ela aconteceu.
        const records = await this.timeRecordsRepository.fetchActiveShift(userId)

        const shiftRecords: ShiftRecord[] = records.map(r => ({ id: r.id, type: r.type, timestamp: r.timestamp }))
        const shifts = groupIntoShifts(shiftRecords, config)
        const openShift = findOpenShift(shifts)

        if (!openShift) {
            return { records: [], hasOpenShift: false }
        }

        // Mesma checagem "ao vivo" do punch-engine: se já se passou um dia de folga real
        // desde o último registro do turno até agora, o turno foi abandonado, não está
        // aberto — evita reviver como "em andamento" um turno que a folga já fechou.
        const lastTimestamp = openShift.records[openShift.records.length - 1].timestamp
        if (hasScheduledRestDayGap(config, lastTimestamp, new Date())) {
            return { records: [], hasOpenShift: false }
        }

        const openRecordIds = new Set(openShift.records.map(r => r.id))
        return {
            records: records.filter(r => openRecordIds.has(r.id)),
            hasOpenShift: true,
        }
    }
}
