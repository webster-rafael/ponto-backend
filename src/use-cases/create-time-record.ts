import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { prisma } from "@/lib/prisma"
import { isRestDay } from "@/lib/work-schedule"
import { computeScheduleDeviation } from "@/lib/schedule-tolerance"
import { TimeRecord } from "@prisma/client"

interface CreateTimeRecordUseCaseRequest {
    userId: string
    type: string
    latitude?: number
    longitude?: number
    photoUrl?: string
    ip?: string
    isOutOfRange?: boolean
    outOfRangeReason?: string
}

interface CreateTimeRecordUseCaseResponse {
    timeRecord: TimeRecord
}

export class CreateTimeRecordUseCase {
    constructor(private timeRecordsRepository: ITimeRecordsRepository) { }

    async execute({
        userId,
        type,
        latitude,
        longitude,
        photoUrl,
        ip,
        isOutOfRange,
        outOfRangeReason,
    }: CreateTimeRecordUseCaseRequest): Promise<CreateTimeRecordUseCaseResponse> {

        // Sempre usa o horário real do SERVIDOR (UTC).
        // O timestamp do cliente é completamente ignorado para impedir fraudes.
        // O frontend é responsável por exibir no fuso de Cuiabá (America/Cuiaba).
        const serverTimestamp = new Date()
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { work_scale: true, work_start_date: true, entry_time: true, exit_time: true },
        })
        const isExtraOnRestDay = isRestDay(
            user?.work_scale,
            serverTimestamp,
            user?.work_start_date ?? null
        )
        const needsApproval = (isOutOfRange ?? false) || isExtraOnRestDay

        // Turno vigia não segue horário fixo de entrada/saída — regra de tolerância não se aplica.
        const scheduleDeviation = user?.work_scale === 'vigia'
            ? null
            : computeScheduleDeviation({
                type,
                timestamp: serverTimestamp,
                entryTime: user?.entry_time,
                exitTime: user?.exit_time,
            })

        const timeRecord = await this.timeRecordsRepository.create({
            user_id: userId,
            type,
            timestamp: serverTimestamp,
            latitude,
            longitude,
            photo_url: photoUrl,
            ip,
            is_out_of_range: needsApproval,
            out_of_range_reason: outOfRangeReason ?? (isExtraOnRestDay ? 'Hora extra em dia de folga' : null),
            out_of_range_status: 'PENDING',
            schedule_deviation_minutes: scheduleDeviation?.minutes ?? null,
            schedule_deviation_type: scheduleDeviation?.type ?? null,
            requires_schedule_justification: !!scheduleDeviation,
        })

        return {
            timeRecord,
        }
    }
}
