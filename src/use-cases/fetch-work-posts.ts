import { IWorkPostsRepository } from "@/repositories/work-posts-repository"
import { WorkPost } from "@prisma/client"

interface FetchWorkPostsUseCaseRequest {
    companyId?: string
}

interface FetchWorkPostsUseCaseResponse {
    workPosts: WorkPost[]
}

export class FetchWorkPostsUseCase {
    constructor(private workPostsRepository: IWorkPostsRepository) { }

    async execute({ companyId }: FetchWorkPostsUseCaseRequest): Promise<FetchWorkPostsUseCaseResponse> {
        const workPosts = companyId
            ? await this.workPostsRepository.findByCompanyId(companyId)
            : await this.workPostsRepository.listAll()

        return { workPosts }
    }
}
