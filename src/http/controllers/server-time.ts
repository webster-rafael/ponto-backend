import { FastifyReply, FastifyRequest } from "fastify"

/**
 * GET /server-time
 *
 * Retorna o horário real do servidor (UTC) e o horário de Cuiabá formatado.
 * O frontend usa isso para sincronizar o relógio interno e impedir que
 * colaboradores "enganem" o sistema alterando o horário do dispositivo.
 */
export async function serverTime(_request: FastifyRequest, reply: FastifyReply) {
    const now = new Date()

    return reply.status(200).send({
        // Timestamp UTC — referência absoluta do momento
        utc: now.toISOString(),
        // Epoch em ms — o frontend usa para calcular o offset
        epoch: now.getTime(),
    })
}
