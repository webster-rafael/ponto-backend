import { IUsersRepository } from "@/repositories/users-repository"
import { ICompaniesRepository } from "@/repositories/companies-repository"
import { User, Company } from "@prisma/client"
import { compare } from "bcryptjs"

const GOOGLE_PLAY_REVIEW_EMAIL = "googleplay@genialseg.app"

interface AuthenticateUseCaseRequest {
    email: string
    password: string
    companyId: string
}

interface AuthenticateUseCaseResponse {
    user: User
    company: Company
}

export class AuthenticateUseCase {
    constructor(
        private usersRepository: IUsersRepository,
        private companiesRepository: ICompaniesRepository
    ) { }

    async execute({
        email,
        password,
        companyId
    }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
        // 1. Find user by email
        const user = await this.usersRepository.findByEmail(email)

        if (!user) {
            throw new Error("Invalid credentials")
        }

        // 2. Validate Company
        const company = await this.companiesRepository.findById(companyId)

        if (!company) {
            throw new Error("Company not found")
        }

        const isGooglePlayReviewUser = user.email.toLowerCase() === GOOGLE_PLAY_REVIEW_EMAIL

        // The user must belong to the selected company, except the Google Play review account.
        if (user.company_id !== companyId && !isGooglePlayReviewUser) {
            throw new Error("Usuário não pertence a esta empresa")
        }

        // 3. Compare passwords
        const doesPasswordMatch = await compare(password, user.password_hash)

        if (!doesPasswordMatch) {
            throw new Error("Invalid credentials")
        }

        return {
            user,
            company,
        }
    }
}
