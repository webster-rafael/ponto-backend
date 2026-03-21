import { FastifyReply, FastifyRequest } from "fastify"
import { randomUUID } from "node:crypto"
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import { extname, join } from "node:path"
import { pipeline } from "node:stream/promises" // Use promises pipeline for cleaner async/await
import { env } from 'process'

export async function upload(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file()

    if (!data) {
        return reply.status(400).send({ message: 'No file uploaded.' })
    }

    const extension = extname(data.filename)
    const fileName = `${randomUUID()}${extension}`

    const uploadDir = join(process.cwd(), 'uploads')

    // Ensure uploads directory exists
    await mkdir(uploadDir, { recursive: true })

    const writeStream = createWriteStream(join(uploadDir, fileName))

    await pipeline(data.file, writeStream)

    const protocol = request.protocol
    const host = request.hostname

    // Construct the public URL
    // If running in Docker behind a proxy, hostname might be internal IP, so prefer ENV variable if available
    // But for simplicity, we return the relative path or full URL.
    // The static file server serves at /uploads/

    const fileUrl = `${protocol}://${host}/uploads/${fileName}`

    return reply.status(201).send({ fileUrl })
}
