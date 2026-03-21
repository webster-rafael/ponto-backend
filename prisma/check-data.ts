import { prisma } from '../src/lib/prisma'

async function main() {
    console.log('Checking Route Logs...')
    const logs = await prisma.routeLog.findMany({
        orderBy: { start_timestamp: 'desc' },
        take: 10
    })
    console.log(`Found ${logs.length} route logs.`)
    console.log(JSON.stringify(logs, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
