import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { CreateWorkPostUseCase } from "@/use-cases/create-work-post"
import { PrismaWorkPostsRepository } from "@/repositories/prisma/prisma-work-posts-repository"
import { PrismaCompaniesRepository } from "@/repositories/prisma/prisma-companies-repository"

export async function createWorkPost(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
        name: z.string().min(1),
        is_vigia: z.boolean().default(false),
        companyId: z.string().uuid(),
    })

    const { name, is_vigia, companyId } = bodySchema.parse(request.body)

    try {
        const workPostsRepository = new PrismaWorkPostsRepository()
        const companiesRepository = new PrismaCompaniesRepository()
        const useCase = new CreateWorkPostUseCase(workPostsRepository, companiesRepository)

        const { workPost } = await useCase.execute({ name, is_vigia, companyId })

        return reply.status(201).send({ workPost })
    } catch (err) {
        if (err instanceof Error && err.message === 'Company not found') {
            return reply.status(404).send({ message: err.message })
        }
        throw err
    }
}
