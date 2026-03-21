import { prisma } from "../../lib/prisma"
import { Prisma, PatrolPoint } from "@prisma/client"
import { IPatrolPointsRepository } from "../patrol-points-repository"

export class PrismaPatrolPointsRepository implements IPatrolPointsRepository {
    async create(data: Prisma.PatrolPointUncheckedCreateInput) {
        const patrolPoint = await prisma.patrolPoint.create({
            data,
        })
        return patrolPoint
    }

    async findManyByUserIdAndDate(userId: string, date: Date) {
        // Filter by the specific day (Start of day to End of day)
        const startOfDay = new Date(date)
        startOfDay.setUTCHours(0, 0, 0, 0)

        const endOfDay = new Date(date)
        endOfDay.setUTCHours(23, 59, 59, 999)

        const patrolPoints = await prisma.patrolPoint.findMany({
            where: {
                user_id: userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                }
            },
            include: {
                checkins: {
                    orderBy: {
                        start_timestamp: 'desc'
                    }
                }
            },
            orderBy: {
                created_at: 'asc'
            }
        })

        return patrolPoints
    }
}
