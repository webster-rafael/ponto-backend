import { IUsersRepository } from "@/repositories/users-repository"
import { User } from "@prisma/client"
import { hash } from "bcryptjs"
import { ICompaniesRepository } from "@/repositories/companies-repository"

interface RegisterUseCaseRequest {
    name: string
    email: string
    password: string
    companyId: string
}

interface RegisterUseCaseResponse {
    user: User
}

export class RegisterUseCase {
    constructor(
        private usersRepository: IUsersRepository,
        private companiesRepository: ICompaniesRepository
    ) { }

    async execute({
        name,
        email,
        password,
        companyId
    }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
        // 1. Check if user already exists
        const userWithSameEmail = await this.usersRepository.findByEmail(email)

        if (userWithSameEmail) {
            throw new Error("User already exists")
        }

        // 2. Check if company exists
        const company = await this.companiesRepository.findById(companyId)

        if (!company) {
            throw new Error("Company not found")
        }

        // 3. Hash password
        const passwordHash = await hash(password, 6)

        // 4. Create user
        const user = await this.usersRepository.create({
            name,
            email,
            password_hash: passwordHash,
            company: {
                connect: { id: companyId }
            }
        })

        return {
            user,
        }
    }
}
