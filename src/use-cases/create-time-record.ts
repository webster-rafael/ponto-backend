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

        // Sempre usa o horário real do servidor (fuso de Cuiabá - America/Cuiaba).
        // O timestamp enviado pelo cliente é descartado para impedir fraudes
        // por mudança de horário no celular ou computador do colaborador.
        const nowInCuiaba = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'America/Cuiaba' })
        )

        const timeRecord = await this.timeRecordsRepository.create({
            user_id: userId,
            type,
            timestamp: nowInCuiaba,
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
