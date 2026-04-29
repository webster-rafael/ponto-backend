import { FastifyReply, FastifyRequest } from "fastify"
import { RegisterJustificationUseCase } from "../../use-cases/register-justification"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

export async function registerJustification(request: FastifyRequest, reply: FastifyReply) {
    const uploadDir = path.resolve(process.cwd(), 'uploads')

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    // With attachFieldsToBody: true, text fields are { value, fieldname, ... }
    // and file fields are MultipartFile objects with .toBuffer(), .filename, .mimetype
    const body = request.body as Record<string, any>
    const dateStr: string | undefined = body?.date?.value
    const description: string | undefined = body?.description?.value?.trim() || undefined

    if (!dateStr) {
        return reply.status(400).send({ message: 'Date is required.' })
    }

    let fileUrl: string | undefined
    const filePart = body?.file
    if (filePart && typeof filePart.toBuffer === 'function') {
        console.log('[justification] filePart.filename:', filePart.filename, '| filePart.mimetype:', filePart.mimetype)
        const buffer: Buffer = await filePart.toBuffer()
        console.log('[justification] buffer.length:', buffer.length)
        if (buffer.length > 0) {
            const extFromName = path.extname(filePart.filename || '')
            const extFromMime = extensionFromMime(filePart.mimetype)
            const extFromMagic = bufferExtension(buffer)
            const ext = extFromName || extFromMime || extFromMagic
            console.log('[justification] ext — name:', extFromName, '| mime:', extFromMime, '| magic:', extFromMagic, '| final:', ext)
            const fileName = `${randomUUID()}${ext}`
            fs.writeFileSync(path.join(uploadDir, fileName), buffer)
            fileUrl = `/uploads/${fileName}`
        }
    }

    if (!fileUrl && !description) {
        return reply.status(400).send({ message: 'File or description is required.' })
    }

    const registerJustificationUseCase = new RegisterJustificationUseCase()

    await registerJustificationUseCase.execute({
        userId: request.user.sub,
        date: new Date(dateStr),
        fileUrl: fileUrl ?? '',
        description,
    })

    return reply.status(201).send()
}

function extensionFromMime(mime: string = ''): string {
    if (mime.includes('pdf'))  return '.pdf'
    if (mime.includes('png'))  return '.png'
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
    if (mime.includes('gif'))  return '.gif'
    if (mime.includes('webp')) return '.webp'
    return ''
}

function bufferExtension(buf: Buffer): string {
    if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return '.pdf'
    if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return '.png'
    if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return '.jpg'
    if (buf.length >= 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a')) return '.gif'
    return '.jpg'
}
