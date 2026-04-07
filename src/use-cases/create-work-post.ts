import { IWorkPostsRepository } from "@/repositories/work-posts-repository"
import { ICompaniesRepository } from "@/repositories/companies-repository"
import { WorkPost } from "@prisma/client"

interface CreateWorkPostUseCaseRequest {
    name: string
    is_vigia: boolean
    companyId: string
}

interface CreateWorkPostUseCaseResponse {
    workPost: WorkPost
}

export class CreateWorkPostUseCase {
    constructor(
        private workPostsRepository: IWorkPostsRepository,
        private companiesRepository: ICompaniesRepository
    ) { }

    async execute({
        name,
        is_vigia,
        companyId,
    }: CreateWorkPostUseCaseRequest): Promise<CreateWorkPostUseCaseResponse> {
        const company = await this.companiesRepository.findById(companyId)

        if (!company) {
            throw new Error("Company not found")
        }

        const workPost = await this.workPostsRepository.create({
            name,
            is_vigia,
            company: { connect: { id: companyId } },
        })

        return { workPost }
    }
}
