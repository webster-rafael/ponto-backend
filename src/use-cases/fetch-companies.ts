import { ICompaniesRepository } from "@/repositories/companies-repository"
import { Company } from "@prisma/client"

interface FetchCompaniesUseCaseResponse {
    companies: Company[]
}

export class FetchCompaniesUseCase {
    constructor(private companiesRepository: ICompaniesRepository) { }

    async execute(): Promise<FetchCompaniesUseCaseResponse> {
        // Simple search for now, fetch first 20 or all
        const companies = await this.companiesRepository.searchMany('', 1)

        return {
            companies,
        }
    }
}
