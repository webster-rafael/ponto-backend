import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { prisma } from "@/lib/prisma"
import { isRestDay } from "@/lib/work-schedule"
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
            select: { work_scale: true, work_start_date: true },
        })
        const isExtraOnRestDay = isRestDay(
            user?.work_scale,
            serverTimestamp,
            user?.work_start_date ?? null
        )
        const needsApproval = (isOutOfRange ?? false) || isExtraOnRestDay

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
        })

        return {
            timeRecord,
        }
    }
}
