import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { prisma } from "@/lib/prisma"
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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { work_scale: true },
        })
        const records = await this.timeRecordsRepository.fetchActiveShift(
            userId,
            user?.work_scale === 'vigia' ? { maxAgeHours: 24 * 30 } : undefined
        )

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
