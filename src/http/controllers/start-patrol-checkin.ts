import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export async function startPatrolCheckin(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
        patrolPointId: z.string().uuid(),
        latitude: z.number(), // Optional validation that they are close? frontend does it, backend could too but let's trust UI for now
        longitude: z.number(),
        timestamp: z.string().datetime(),
    })

    const { patrolPointId, timestamp } = bodySchema.parse(request.body)

    const checkin = await prisma.patrolCheckin.create({
        data: {
            patrol_point_id: patrolPointId,
            start_timestamp: new Date(timestamp),
        }
    })

    return reply.status(201).send(checkin)
}
