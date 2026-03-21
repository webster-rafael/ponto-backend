
import { FastifyReply, FastifyRequest } from "fastify"
import { RegisterJustificationUseCase } from "../../use-cases/register-justification"
import fs from "node:fs"
import util from "node:util"
import { pipeline } from "node:stream"
import path from "node:path"
import { randomUUID } from "node:crypto"

const pump = util.promisify(pipeline)

export async function registerJustification(request: FastifyRequest, reply: FastifyReply) {
    const uploadDir = path.resolve(process.cwd(), 'uploads')

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    // fastify-multipart puts fields in parts
    const parts = request.parts()

    let dateStr: string | undefined
    let fileUrl: string | undefined

    for await (const part of parts) {
        if (part.type === 'file') {
            const extension = path.extname(part.filename)
            const fileName = `${randomUUID()}${extension}`
            const filePath = path.join(uploadDir, fileName)

            await pump(part.file, fs.createWriteStream(filePath))

            // For now, storing just the filename. 
            // In a real app with static serving, might be /uploads/filename
            fileUrl = fileName
        } else {
            if (part.fieldname === 'date') {
                // part.value is generic, cast to string
                dateStr = part.value as string
            }
        }
    }

    if (!dateStr) {
        return reply.status(400).send({ message: 'Date is required.' })
    }

    if (!fileUrl) {
        return reply.status(400).send({ message: 'File is required.' })
    }

    const registerJustificationUseCase = new RegisterJustificationUseCase()

    await registerJustificationUseCase.execute({
        userId: request.user.sub,
        date: new Date(dateStr),
        fileUrl,
    })

    return reply.status(201).send()
}
