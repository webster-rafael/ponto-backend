import { prisma } from "@/lib/prisma"
import { ManualPunchRequest } from "@prisma/client"

interface FetchUserManualPunchRequestsUseCaseRequest {
    userId: string
}

interface FetchUserManualPunchRequestsUseCaseResponse {
    manualPunchRequests: ManualPunchRequest[]
}

export class FetchUserManualPunchRequestsUseCase {
    async execute({ userId }: FetchUserManualPunchRequestsUseCaseRequest): Promise<FetchUserManualPunchRequestsUseCaseResponse> {
        const manualPunchRequests = await prisma.manualPunchRequest.findMany({
            where: { user_id: userId },
            orderBy: { created_at: "desc" },
        })

        return { manualPunchRequests }
    }
}
