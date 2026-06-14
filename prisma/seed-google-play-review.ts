import dotenv from "dotenv"
import { hash } from "bcryptjs"
import { PrismaClient } from "@prisma/client"

dotenv.config()

const prisma = new PrismaClient()

const REVIEW_EMAIL = "googleplay@genialseg.app"
const REVIEW_PASSWORD = "GenialSeg@2026"

async function main() {
    const company = await prisma.company.findFirst({
        orderBy: { name: "asc" },
    })

    if (!company) {
        throw new Error("Nenhuma empresa encontrada para vincular a conta de teste.")
    }

    const passwordHash = await hash(REVIEW_PASSWORD, 6)

    const user = await prisma.user.upsert({
        where: { email: REVIEW_EMAIL },
        update: {
            name: "Google Play Review",
            password_hash: passwordHash,
            company_id: company.id,
            post_id: null,
            work_scale: "5x2",
            entry_time: "08:00",
            lunch_start: "12:00",
            lunch_end: "13:00",
            exit_time: "17:00",
        },
        create: {
            name: "Google Play Review",
            email: REVIEW_EMAIL,
            password_hash: passwordHash,
            company_id: company.id,
            work_scale: "5x2",
            entry_time: "08:00",
            lunch_start: "12:00",
            lunch_end: "13:00",
            exit_time: "17:00",
        },
    })

    console.log("Conta de teste do Google Play pronta:")
    console.log(`Email: ${user.email}`)
    console.log(`Senha: ${REVIEW_PASSWORD}`)
    console.log(`Empresa base: ${company.name}`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
