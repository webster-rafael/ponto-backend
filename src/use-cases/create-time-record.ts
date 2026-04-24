import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
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

        const timeRecord = await this.timeRecordsRepository.create({
            user_id: userId,
            type,
            timestamp: serverTimestamp,
            latitude,
            longitude,
            photo_url: photoUrl,
            ip,
            is_out_of_range: isOutOfRange ?? false,
            out_of_range_reason: outOfRangeReason ?? null,
            out_of_range_status: 'PENDING',
        })

        return {
            timeRecord,
        }
    }
}
