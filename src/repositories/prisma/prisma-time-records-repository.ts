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

    async fetchActiveShift(userId: string, options?: { maxAgeHours?: number }): Promise<TimeRecord[]> {
        // Janela ampla o bastante pra pegar a entrada de abertura de um turno
        // esquecido ou legitimamente longo (vigia em viagem) — quem decide se o
        // turno ainda está aberto é o motor de turnos (ponto-engine), não este
        // método: ele só devolve os registros recentes pra o use-case agrupar.
        const maxAgeHours = options?.maxAgeHours ?? 24 * 30
        const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

        return prisma.timeRecord.findMany({
            where: {
                user_id: userId,
                timestamp: { gte: since },
            },
            orderBy: { timestamp: 'asc' },
        })
    }
}
