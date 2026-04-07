import { WorkPost, Prisma } from '@prisma/client'

export interface IWorkPostsRepository {
    findById(id: string): Promise<WorkPost | null>
    findByCompanyId(companyId: string): Promise<WorkPost[]>
    listAll(): Promise<WorkPost[]>
    create(data: Prisma.WorkPostCreateInput): Promise<WorkPost>
    save(post: WorkPost): Promise<WorkPost>
    delete(id: string): Promise<void>
}
