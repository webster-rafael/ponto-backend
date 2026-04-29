import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function updatePushToken(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    pushToken: z.string().nullable(),
  });

  const { pushToken } = bodySchema.parse(request.body);
  const userId = (request.user as any).sub;

  await prisma.user.update({
    where: { id: userId },
    data: { push_token: pushToken },
  });

  return reply.status(204).send();
}
