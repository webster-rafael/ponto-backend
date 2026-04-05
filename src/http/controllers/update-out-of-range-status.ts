import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function updateOutOfRangeStatus(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
        id: z.string().uuid(),
    })

    const bodySchema = z.object({
        status: z.enum(['APPROVED', 'REJECTED']),
    })

    const { id } = paramsSchema.parse(request.params)
    const { status } = bodySchema.parse(request.body)

    const record = await prisma.timeRecord.findUnique({ where: { id } })

    if (!record) {
        return reply.status(404).send({ message: 'Registro não encontrado.' })
    }

    if (!record.is_out_of_range) {
        return reply.status(400).send({ message: 'Este registro não é um ponto fora do raio.' })
    }

    const updated = await prisma.timeRecord.update({
        where: { id },
        data: { out_of_range_status: status },
    })

    return reply.status(200).send(updated)
}
