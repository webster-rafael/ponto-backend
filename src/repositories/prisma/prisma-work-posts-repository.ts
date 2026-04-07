import { prisma } from "@/lib/prisma"
import { IWorkPostsRepository } from "../work-posts-repository"
import { WorkPost, Prisma } from "@prisma/client"

export class PrismaWorkPostsRepository implements IWorkPostsRepository {
    async findById(id: string): Promise<WorkPost | null> {
        return prisma.workPost.findUnique({ where: { id } })
    }

    async findByCompanyId(companyId: string): Promise<WorkPost[]> {
        return prisma.workPost.findMany({ where: { company_id: companyId } })
    }

    async listAll(): Promise<WorkPost[]> {
        return prisma.workPost.findMany({ orderBy: { name: 'asc' } })
    }

    async create(data: Prisma.WorkPostCreateInput): Promise<WorkPost> {
        return prisma.workPost.create({ data })
    }

    async save(post: WorkPost): Promise<WorkPost> {
        return prisma.workPost.update({
            where: { id: post.id },
            data: post,
        })
    }

    async delete(id: string): Promise<void> {
        await prisma.workPost.delete({ where: { id } })
    }
}
