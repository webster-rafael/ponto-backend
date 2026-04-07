import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { RegisterUseCase } from "@/use-cases/register"
import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository"
import { PrismaCompaniesRepository } from "@/repositories/prisma/prisma-companies-repository"
import { PrismaWorkPostsRepository } from "@/repositories/prisma/prisma-work-posts-repository"

export async function register(request: FastifyRequest, reply: FastifyReply) {
    const registerBodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        companyId: z.string().uuid().optional(),
        postId: z.string().uuid().optional(),
    }).refine(data => data.companyId || data.postId, {
        message: "companyId or postId is required",
    })

    const { name, email, password, companyId, postId } = registerBodySchema.parse(request.body)

    try {
        const usersRepository = new PrismaUsersRepository()
        const companiesRepository = new PrismaCompaniesRepository()
        const workPostsRepository = new PrismaWorkPostsRepository()
        const registerUseCase = new RegisterUseCase(usersRepository, companiesRepository, workPostsRepository)

        await registerUseCase.execute({
            name,
            email,
            password,
            companyId,
            postId,
        })
    } catch (err) {
        if (err instanceof Error && err.message === 'User already exists') {
            return reply.status(409).send({ message: err.message })
        }
        throw err
    }

    return reply.status(201).send()
}
