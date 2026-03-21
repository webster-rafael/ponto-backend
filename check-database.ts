import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
    console.log('📊 Verificando dados no banco...\n')

    // Empresas
    const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' }
    })
    console.log('🏢 EMPRESAS:')
    companies.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.slug})`)
        console.log(`      Cor: ${c.theme_color}`)
    })

    // Usuários
    const users = await prisma.user.findMany({
        include: { company: true },
        orderBy: { email: 'asc' }
    })
    console.log('\n👥 USUÁRIOS:')
    users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.name} - ${u.email}`)
        console.log(`      Empresa: ${u.company.name}`)
    })

    // Pontos de patrulha
    const patrolPoints = await prisma.patrolPoint.findMany({
        include: { user: { include: { company: true } } }
    })
    console.log('\n📍 PONTOS DE PATRULHA:')
    if (patrolPoints.length === 0) {
        console.log('   Nenhum ponto de patrulha encontrado.')
    } else {
        patrolPoints.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.title}`)
            console.log(`      Usuário: ${p.user.name} (${p.user.company.name})`)
        })
    }

    await prisma.$disconnect()
}

checkDatabase()
