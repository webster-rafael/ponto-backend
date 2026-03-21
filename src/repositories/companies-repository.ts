import { Company, Prisma } from '@prisma/client'

export interface ICompaniesRepository {
    findById(id: string): Promise<Company | null>
    findBySlug(slug: string): Promise<Company | null>
    searchMany(query: string, page: number): Promise<Company[]>
}
