import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { AuthenticateUseCase } from "@/use-cases/authenticate"
import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository"
import { PrismaCompaniesRepository } from "@/repositories/prisma/prisma-companies-repository"

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const authenticateBodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        companyId: z.string().uuid(),
    })

    const { email, password, companyId } = authenticateBodySchema.parse(request.body)

    try {
        const usersRepository = new PrismaUsersRepository()
        const companiesRepository = new PrismaCompaniesRepository()
        const authenticateUseCase = new AuthenticateUseCase(usersRepository, companiesRepository)

        const { user, company } = await authenticateUseCase.execute({
            email,
            password,
            companyId,
        })

        const token = await reply.jwtSign(
            {},
            {
                sign: {
                    sub: user.id,
                },
            },
        )

        return reply.status(200).send({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company_id: user.company_id,
            },
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                theme_color: company.theme_color,
                logo_url: company.logo_url,
                latitude: company.latitude,
                longitude: company.longitude,
            }
        })

    } catch (err) {
        if (err instanceof Error && (err.message === 'Invalid credentials' || err.message === 'Usuário não pertence a esta empresa')) {
            return reply.status(400).send({ message: err.message })
        }
        throw err
    }
}
