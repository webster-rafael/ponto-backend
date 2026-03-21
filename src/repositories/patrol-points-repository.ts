import { PatrolPoint, Prisma } from "@prisma/client"

export interface IPatrolPointsRepository {
    create(data: Prisma.PatrolPointUncheckedCreateInput): Promise<PatrolPoint>
    findManyByUserIdAndDate(userId: string, date: Date): Promise<PatrolPoint[]>
}
