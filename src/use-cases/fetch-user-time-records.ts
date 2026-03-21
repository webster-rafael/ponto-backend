import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { TimeRecord } from "@prisma/client"

interface FetchUserTimeRecordsUseCaseRequest {
    userId: string
    date?: string // YYYY-MM-DD
    fromDate?: string
    toDate?: string
}

interface FetchUserTimeRecordsUseCaseResponse {
    timeRecords: TimeRecord[]
}

export class FetchUserTimeRecordsUseCase {
    constructor(private timeRecordsRepository: ITimeRecordsRepository) { }

    async execute({
        userId,
        date,
        fromDate,
        toDate
    }: FetchUserTimeRecordsUseCaseRequest): Promise<FetchUserTimeRecordsUseCaseResponse> {

        const timeRecords = await this.timeRecordsRepository.fetchByUserId(userId, date, fromDate, toDate)

        return {
            timeRecords,
        }
    }
}
