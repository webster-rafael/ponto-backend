import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // 1. Find the Vigia user (or any user)
    // Trying to find a user that looks like the one we've been using, or just the first one.
    const user = await prisma.user.findFirst({
        where: {
            email: {
                contains: 'vigia'
            }
        }
    })

    if (!user) {
        console.log('No user found with "vigia" in email. Trying absolute first user.')
        const firstUser = await prisma.user.findFirst()
        if (!firstUser) {
            console.log('No users found at all. Please register a user first.')
            return
        }
        await seedPoints(firstUser.id)
    } else {
        await seedPoints(user.id)
    }
}

async function seedPoints(userId: string) {
    console.log(`Seeding points for user: ${userId}`)

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    // Clear existing points for today to avoid duplicates on re-run
    await prisma.patrolPoint.deleteMany({
        where: {
            user_id: userId,
            date: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        }
    })

    // Campo Grande / MS rough coordinates
    const baseLat = -20.4697
    const baseLng = -54.6201

    const points = [
        {
            title: 'Portaria Principal',
            description: 'Verificar identificação e fluxo de entrada.',
            latitude: baseLat + 0.001,
            longitude: baseLng + 0.001,
        },
        {
            title: 'Estacionamento Norte',
            description: 'Ronda geral e verificação de veículos.',
            latitude: baseLat - 0.002,
            longitude: baseLng + 0.002,
        },
        {
            title: 'Bloco Administrativo',
            description: 'Verificar portas e janelas trancadas.',
            latitude: baseLat + 0.003,
            longitude: baseLng - 0.001,
        },
        {
            title: 'Fundos / Depósito',
            description: 'Área sensível, atenção redobrada.',
            latitude: baseLat - 0.001,
            longitude: baseLng - 0.003,
        }
    ]

    for (const p of points) {
        await prisma.patrolPoint.create({
            data: {
                user_id: userId,
                date: new Date(), // Now
                latitude: p.latitude,
                longitude: p.longitude,
                title: p.title,
                description: p.description
            }
        })
    }

    console.log(`Created ${points.length} patrol points for today.`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })