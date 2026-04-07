import { IUsersRepository } from "@/repositories/users-repository"
import { User } from "@prisma/client"
import { hash } from "bcryptjs"
import { ICompaniesRepository } from "@/repositories/companies-repository"
import { IWorkPostsRepository } from "@/repositories/work-posts-repository"

interface RegisterUseCaseRequest {
    name: string
    email: string
    password: string
    companyId?: string
    postId?: string
}

interface RegisterUseCaseResponse {
    user: User
}

export class RegisterUseCase {
    constructor(
        private usersRepository: IUsersRepository,
        private companiesRepository: ICompaniesRepository,
        private workPostsRepository?: IWorkPostsRepository
    ) { }

    async execute({
        name,
        email,
        password,
        companyId,
        postId,
    }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
        // 1. Check if user already exists
        const userWithSameEmail = await this.usersRepository.findByEmail(email)

        if (userWithSameEmail) {
            throw new Error("User already exists")
        }

        // 2. Resolve company and post
        let resolvedCompanyId = companyId
        let resolvedPostId = postId

        if (postId && this.workPostsRepository) {
            const post = await this.workPostsRepository.findById(postId)
            if (!post) {
                throw new Error("Work post not found")
            }
            resolvedCompanyId = post.company_id
            resolvedPostId = post.id
        }

        if (!resolvedCompanyId) {
            throw new Error("Company or work post is required")
        }

        const company = await this.companiesRepository.findById(resolvedCompanyId)

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
                connect: { id: resolvedCompanyId }
            },
            ...(resolvedPostId ? { post: { connect: { id: resolvedPostId } } } : {}),
        })

        return {
            user,
        }
    }
}
