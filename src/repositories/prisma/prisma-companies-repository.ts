import { prisma } from "@/lib/prisma"
import { ICompaniesRepository } from "../companies-repository"
import { Company } from "@prisma/client"

export class PrismaCompaniesRepository implements ICompaniesRepository {
    async findById(id: string): Promise<Company | null> {
        const company = await prisma.company.findUnique({
            where: {
                id,
            },
        })

        return company
    }

    async findBySlug(slug: string): Promise<Company | null> {
        const company = await prisma.company.findUnique({
            where: {
                slug,
            },
        })
        return company
    }

    async searchMany(query: string, page: number): Promise<Company[]> {
        const companies = await prisma.company.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            take: 20,
            skip: (page - 1) * 20,
        })
        return companies
    }
}
