import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function updatePassword(request: FastifyRequest, reply: FastifyReply) {
    const updatePasswordBodySchema = z.object({
        password: z.string().min(6),
    })

    const { password } = updatePasswordBodySchema.parse(request.body)
    const userId = (request.user as any).sub

    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        return reply.status(404).send({ message: 'User not found' })
    }

    const passwordHash = await hash(password, 6)

    await prisma.user.update({
        where: { id: userId },
        data: {
            password_hash: passwordHash
        }
    })

    return reply.status(200).send({ message: 'Password updated successfully' })
}
