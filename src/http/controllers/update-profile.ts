import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'
import { UpdateUserProfileUseCase } from '@/use-cases/update-user-profile'

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const updateProfileBodySchema = z.object({
        name: z.string(),
        avatarUrl: z.string().nullable().optional(),
    })

    // Validate body
    const { name, avatarUrl } = updateProfileBodySchema.parse(request.body)

    // User ID from JWT
    const userId = (request.user as any).sub

    const usersRepository = new PrismaUsersRepository()
    const updateUserProfileUseCase = new UpdateUserProfileUseCase(usersRepository)

    const { user } = await updateUserProfileUseCase.execute({
        userId,
        name,
        avatarUrl,
    })

    return reply.status(200).send({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            company_id: user.company_id,
            avatar_url: (user as any).avatar_url,
        }
    })
}
