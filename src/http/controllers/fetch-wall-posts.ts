import { FastifyReply, FastifyRequest } from "fastify"
import { prisma } from "../../lib/prisma"

export async function fetchWallPosts(request: FastifyRequest, reply: FastifyReply) {
    const posts = await prisma.wallPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            author: {
                select: {
                    name: true,
                    role: true
                }
            }
        }
    })

    return reply.status(200).send({
        posts: posts.map(post => ({
            id: post.id,
            title: post.title,
            description: post.content,
            type: post.type, // Enum will be serialized as string
            date: post.createdAt,
            author: post.author.name,
            role: post.author.role
        }))
    })
}
