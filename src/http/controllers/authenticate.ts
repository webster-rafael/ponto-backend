import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { AuthenticateUseCase } from "@/use-cases/authenticate"
import { PrismaUsersRepository } from "@/repositories/prisma/prisma-users-repository"
import { PrismaCompaniesRepository } from "@/repositories/prisma/prisma-companies-repository"
import { prisma } from "@/lib/prisma"

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

        let post = null
        if (user.post_id) {
            post = await prisma.workPost.findUnique({ where: { id: user.post_id } })
        }

        return reply.status(200).send({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company_id: user.company_id,
                post_id: user.post_id ?? null,
                work_scale: user.work_scale ?? null,
                entry_time: user.entry_time ?? null,
                exit_time: user.exit_time ?? null,
                lunch_start: user.lunch_start ?? null,
                lunch_end: user.lunch_end ?? null,
            },
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                theme_color: company.theme_color,
                logo_url: company.logo_url,
                latitude: company.latitude,
                longitude: company.longitude,
            },
            post: post ? {
                id: post.id,
                name: post.name,
                is_vigia: post.is_vigia,
                latitude: post.latitude,
                longitude: post.longitude,
            } : null,
        })

    } catch (err) {
        if (err instanceof Error && (err.message === 'Invalid credentials' || err.message === 'Usuário não pertence a esta empresa')) {
            return reply.status(400).send({ message: err.message })
        }
        throw err
    }
}
