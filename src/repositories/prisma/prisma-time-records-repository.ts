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
                timestamp: 'desc'
            }
        })

        return timeRecords
    }

    async fetchActiveShift(userId: string): Promise<TimeRecord[]> {
        // 18h cobre qualquer turno real (até noturnos longos de 12h-16h).
        // Se passaram mais de 18h sem saída, considera que o colaborador esqueceu — começa do zero.
        const since = new Date(Date.now() - 18 * 60 * 60 * 1000)

        const recent = await prisma.timeRecord.findMany({
            where: {
                user_id: userId,
                timestamp: { gte: since },
            },
            orderBy: { timestamp: 'desc' },
        })

        if (recent.length === 0) return []

        // Se o registro mais recente é saida, não há turno aberto
        if (recent[0].type === 'saida') return []

        // Retorna todos os registros do turno aberto (mesmo grupo contíguo)
        // Um novo turno começa após uma saida, então pegamos tudo até a última saida (exclusive)
        const shiftRecords: TimeRecord[] = []
        for (const record of recent) {
            if (record.type === 'saida') break
            shiftRecords.push(record)
        }

        // Inclui a última saida se existir (para ter o contexto completo do grupo anterior)
        // Na prática retornamos só os registros sem saida — o frontend determina o próximo passo
        return shiftRecords
    }
}
