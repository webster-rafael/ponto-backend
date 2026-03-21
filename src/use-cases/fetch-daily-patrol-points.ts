import { PatrolPoint } from "@prisma/client"
import { IPatrolPointsRepository } from "../repositories/patrol-points-repository"

interface FetchDailyPatrolPointsUseCaseRequest {
    userId: string
    date: Date
}

interface FetchDailyPatrolPointsUseCaseResponse {
    patrolPoints: PatrolPoint[]
}

export class FetchDailyPatrolPointsUseCase {
    constructor(private patrolPointsRepository: IPatrolPointsRepository) { }

    async execute({
        userId,
        date
    }: FetchDailyPatrolPointsUseCaseRequest): Promise<FetchDailyPatrolPointsUseCaseResponse> {
        const patrolPoints = await this.patrolPointsRepository.findManyByUserIdAndDate(
            userId,
            date
        )

        return {
            patrolPoints,
        }
    }
}
