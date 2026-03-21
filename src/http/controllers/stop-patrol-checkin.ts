import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export async function stopPatrolCheckin(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
        checkinId: z.string().uuid(),
        timestamp: z.string().datetime(),
    })

    const { checkinId, timestamp } = bodySchema.parse(request.body)
    const endTime = new Date(timestamp)

    const checkin = await prisma.patrolCheckin.findUnique({
        where: { id: checkinId }
    })

    if (!checkin) {
        return reply.status(404).send({ message: "Checkin not found" })
    }

    if (checkin.end_timestamp) {
        return reply.status(400).send({ message: "Checkin already stopped" })
    }

    const startTime = new Date(checkin.start_timestamp)
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    const updated = await prisma.patrolCheckin.update({
        where: { id: checkinId },
        data: {
            end_timestamp: endTime,
            duration_seconds: durationSeconds
        }
    })

    return reply.status(200).send(updated)
}
