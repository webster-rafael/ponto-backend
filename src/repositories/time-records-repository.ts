import { Prisma, TimeRecord } from "@prisma/client"

export interface ITimeRecordsRepository {
    create(data: Prisma.TimeRecordUncheckedCreateInput): Promise<TimeRecord>
    fetchByUserId(userId: string, date?: string, fromDate?: string, toDate?: string): Promise<TimeRecord[]>
    fetchActiveShift(userId: string): Promise<TimeRecord[]>
}
