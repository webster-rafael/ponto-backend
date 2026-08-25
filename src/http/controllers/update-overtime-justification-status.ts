import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { notifyUser } from "@/lib/notify-user"

export async function updateOvertimeJustificationStatus(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) })

    const { id } = paramsSchema.parse(request.params)
    const { status } = bodySchema.parse(request.body)

    const record = await prisma.timeRecord.findUnique({ where: { id } })

    if (!record) {
        return reply.status(404).send({ message: "Registro não encontrado." })
    }

    if (!record.requires_overtime_justification) {
        return reply.status(400).send({ message: "Este registro não tem justificativa de hora extra pendente." })
    }

    const updated = await prisma.timeRecord.update({
        where: { id },
        data: { overtime_justification_status: status },
    })

    if (status === "APPROVED") {
        const user = await prisma.user.findUnique({ where: { id: record.user_id } })
        if (user) {
            notifyUser({
                userId: user.id,
                pushToken: user.push_token,
                title: "Hora extra aprovada ✓",
                body: "Sua justificativa de hora extra foi aprovada pelo RH.",
                data: { type: "overtime_justification_approved", recordId: id },
            })
        }
    }

    return reply.status(200).send(updated)
}
