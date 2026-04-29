import { FastifyReply, FastifyRequest } from "fastify"
import { prisma } from "@/lib/prisma"

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.status(404).send({ message: "User not found" })

    const company = await prisma.company.findUnique({ where: { id: user.company_id } })
    if (!company) return reply.status(404).send({ message: "Company not found" })

    let post = null
    if (user.post_id) {
        post = await prisma.workPost.findUnique({ where: { id: user.post_id } })
    }

    return reply.status(200).send({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            company_id: user.company_id,
            post_id: user.post_id ?? null,
            work_scale: user.work_scale ?? null,
            entry_time: user.entry_time ?? null,
            exit_time: user.exit_time ?? null,
            lunch_start: user.lunch_start ?? null,
            lunch_end: user.lunch_end ?? null,
        },
        company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
            theme_color: company.theme_color,
            logo_url: company.logo_url,
            latitude: company.latitude,
            longitude: company.longitude,
        },
        post: post ? {
            id: post.id,
            name: post.name,
            is_vigia: post.is_vigia,
            latitude: post.latitude,
            longitude: post.longitude,
        } : null,
    })
}
