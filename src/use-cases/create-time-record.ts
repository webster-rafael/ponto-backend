import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { TimeRecord } from "@prisma/client"

interface CreateTimeRecordUseCaseRequest {
    userId: string
    type: string
    latitude?: number
    longitude?: number
    photoUrl?: string
    ip?: string
    timestamp?: Date
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
        timestamp,
        isOutOfRange,
        outOfRangeReason,
    }: CreateTimeRecordUseCaseRequest): Promise<CreateTimeRecordUseCaseResponse> {

        const timeRecord = await this.timeRecordsRepository.create({
            user_id: userId,
            type,
            timestamp: timestamp || new Date(),
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
