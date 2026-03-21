import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { RegisterUseCase } from "@/use-cases/register"
import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository"
import { PrismaCompaniesRepository } from "@/repositories/prisma/prisma-companies-repository"

export async function register(request: FastifyRequest, reply: FastifyReply) {
    const registerBodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        companyId: z.string().uuid(),
    })

    const { name, email, password, companyId } = registerBodySchema.parse(request.body)

    try {
        const usersRepository = new PrismaUsersRepository()
        const companiesRepository = new PrismaCompaniesRepository()
        const registerUseCase = new RegisterUseCase(usersRepository, companiesRepository)

        await registerUseCase.execute({
            name,
            email,
            password,
            companyId,
        })
    } catch (err) {
        if (err instanceof Error && err.message === 'User already exists') {
            return reply.status(409).send({ message: err.message })
        }
        throw err
    }

    return reply.status(201).send()
}
