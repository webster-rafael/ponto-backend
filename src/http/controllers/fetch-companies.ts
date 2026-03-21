import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FetchCompaniesUseCase } from "@/use-cases/fetch-companies"
import { PrismaCompaniesRepository } from "@/repositories/prisma/prisma-companies-repository"

export async function fetchCompanies(request: FastifyRequest, reply: FastifyReply) {
    const companiesRepository = new PrismaCompaniesRepository()
    const fetchCompaniesUseCase = new FetchCompaniesUseCase(companiesRepository)

    const { companies } = await fetchCompaniesUseCase.execute()

    return reply.status(200).send({
        companies,
    })
}
