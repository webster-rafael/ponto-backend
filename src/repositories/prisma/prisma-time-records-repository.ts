import { prisma } from "@/lib/prisma"
import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { Prisma, TimeRecord } from "@prisma/client"

export class PrismaTimeRecordsRepository implements ITimeRecordsRepository {
    async create(data: Prisma.TimeRecordUncheckedCreateInput) {
        const timeRecord = await prisma.timeRecord.create({
            data,
        })

        return timeRecord
    }

    async fetchByUserId(userId: string, date?: string, fromDate?: string, toDate?: string) {
        const whereClause: Prisma.TimeRecordWhereInput = {
            user_id: userId
        }

        if (date) {
            whereClause.timestamp = {
                gte: new Date(`${date}T00:00:00-04:00`),
                lte: new Date(`${date}T23:59:59-04:00`)
            }
        } else if (fromDate || toDate) {
            whereClause.timestamp = {}
            if (fromDate) {
                whereClause.timestamp.gte = new Date(`${fromDate}T00:00:00-04:00`)
            }
            if (toDate) {
                whereClause.timestamp.lte = new Date(`${toDate}T23:59:59-04:00`)
            }
        }

        const timeRecords = await prisma.timeRecord.findMany({
            where: whereClause,
            orderBy: {
                timestamp: 'desc' // History usually wants newest first
            }
        })

        return timeRecords
    }
}
