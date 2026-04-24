import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { CreateTimeRecordUseCase } from "@/use-cases/create-time-record"
import { PrismaTimeRecordsRepository } from "@/repositories/prisma/prisma-time-records-repository"

export async function createTimeRecord(request: FastifyRequest, reply: FastifyReply) {
    const createTimeRecordBodySchema = z.object({
        userId: z.string().uuid(),
        type: z.enum(['entrada', 'almoco_saida', 'almoco_volta', 'saida']),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        photoUrl: z.string().nullable().optional(),
        ip: z.string().nullable().optional(),
        // timestamp do cliente é IGNORADO intencionalmente para evitar fraude de horário.
        // O horário real de Cuiabá é sempre gerado pelo servidor.
        isOutOfRange: z.boolean().optional(),
        outOfRangeReason: z.string().optional(),
    })

    const { userId, type, latitude, longitude, photoUrl, ip, isOutOfRange, outOfRangeReason } = createTimeRecordBodySchema.parse(request.body)

    try {
        const timeRecordsRepository = new PrismaTimeRecordsRepository()
        const createTimeRecordUseCase = new CreateTimeRecordUseCase(timeRecordsRepository)

        const { timeRecord } = await createTimeRecordUseCase.execute({
            userId,
            type,
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
            photoUrl: photoUrl ?? undefined,
            ip: ip ?? undefined,
            isOutOfRange: isOutOfRange ?? false,
            outOfRangeReason: outOfRangeReason ?? undefined,
        })

        return reply.status(201).send(timeRecord)

    } catch (err) {
        throw err
    }
}
