import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { TimeRecord } from "@prisma/client"

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
        const records = await this.timeRecordsRepository.fetchActiveShift(userId)

        const sorted = [...records].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        const last = sorted[0]
        const hasOpenShift = !!last && last.type !== 'saida'

        return {
            records: hasOpenShift ? records : [],
            hasOpenShift,
        }
    }
}
