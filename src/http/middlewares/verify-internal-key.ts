import { FastifyReply, FastifyRequest } from "fastify"

// Autentica chamadas servidor-a-servidor vindas do dashboard (RH) — nunca usado em
// rotas que o app mobile/colaborador chama. A chave nunca chega ao browser: o
// dashboard só a usa em Server Actions/Server Components, do lado do servidor.
export async function verifyInternalKey(request: FastifyRequest, reply: FastifyReply) {
    const expected = process.env.PONTO_INTERNAL_API_KEY
    const provided = request.headers["x-internal-api-key"]

    if (!expected || provided !== expected) {
        return reply.status(401).send({ message: "Unauthorized." })
    }
}
