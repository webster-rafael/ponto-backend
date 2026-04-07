import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchWorkPostsUseCase } from "@/use-cases/fetch-work-posts"
import { PrismaWorkPostsRepository } from "@/repositories/prisma/prisma-work-posts-repository"

export async function fetchWorkPosts(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
        companyId: z.string().uuid().optional(),
    })

    const { companyId } = querySchema.parse(request.query)

    const workPostsRepository = new PrismaWorkPostsRepository()
    const useCase = new FetchWorkPostsUseCase(workPostsRepository)

    const { workPosts } = await useCase.execute({ companyId })

    return reply.status(200).send({ workPosts })
}
