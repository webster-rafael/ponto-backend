import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { PreviewPunchUseCase } from "@/use-cases/preview-punch"
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

        // Mesma decisão exposta em GET /punch-preview: o que o app viu antes de bater
        // é, por construção, o que a gravação aplica.
        const { isExtraOnRestDay, scheduleDeviation } = await new PreviewPunchUseCase().execute({
            userId,
            type,
            timestamp: serverTimestamp,
        })
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
            schedule_deviation_minutes: scheduleDeviation?.minutes ?? null,
            schedule_deviation_type: scheduleDeviation?.type ?? null,
            requires_schedule_justification: !!scheduleDeviation,
        })

        return {
            timeRecord,
        }
    }
}
