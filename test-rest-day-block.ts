// Verificação do bloqueio novo: colaborador sem does_overtime não pode começar um
// turno novo num dia de folga. Não pode afetar: outras escalas, turnos que já estão
// abertos atravessando pra dentro de um dia de folga, nem vigia.
import { prisma } from "./src/lib/prisma"
import { cuiabaInstant, toCuiabaDateKey } from "./src/lib/ponto-engine/cuiaba-time"

const baseUrl = process.env.TEST_API_URL || "http://localhost:3555"
let passed = 0, failed = 0
function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    if (ok) { passed++; console.log(`✅ ${name}`) }
    else { failed++; console.error(`❌ ${name}\n   esperado: ${JSON.stringify(expected)}\n   obtido:   ${JSON.stringify(actual)}`) }
}

async function makeUser(name: string) {
    const companiesRes = await fetch(`${baseUrl}/companies`)
    const { companies } = await companiesRes.json()
    const companyId = companies[0].id
    const emailSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    const email = `${emailSlug}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`
    await fetch(`${baseUrl}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: "password123", companyId }),
    })
    const loginRes = await fetch(`${baseUrl}/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123", companyId }),
    })
    const { user, token } = await loginRes.json()
    return { userId: user.id as string, token: token as string }
}

async function cleanup(userId: string) {
    await prisma.timeRecord.deleteMany({ where: { user_id: userId } })
    await prisma.justification.deleteMany({ where: { user_id: userId } })
    await prisma.manualPunchRequest.deleteMany({ where: { user_id: userId } })
    await prisma.user.delete({ where: { id: userId } })
}

async function main() {
    // Datas calculadas em cima do "agora" real do servidor (não fixas), pra o teste
    // valer não importa quando rodar. O caso 5x2 depende de "hoje" já ser fim de
    // semana de verdade (é o cenário que o usuário reportou ao vivo); os casos 12x36
    // são ancorados via work_start_date relativo a "hoje"/"ontem", então funcionam
    // em qualquer dia real.
    const today = toCuiabaDateKey(new Date())
    const yesterday = toCuiabaDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const todayDow = new Date(new Date().getTime() - 4 * 60 * 60 * 1000).getUTCDay()
    if (todayDow !== 0 && todayDow !== 6) {
        console.log(`⚠️  Hoje (${today}) não é fim de semana no relógio real deste ambiente —`)
        console.log(`   os casos 1 e 2 (5x2 domingo) não vão exercitar o cenário pretendido.`)
        console.log(`   (Os casos 3-6, ancorados em work_start_date relativo a hoje, valem de qualquer jeito.)\n`)
    }

    // 1) 5x2, domingo, does_overtime=false, sem turno aberto -> bloqueado
    {
        const { userId } = await makeUser("Teste Block 5x2 Sem Overtime")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "5x2", entry_time: "08:00", exit_time: "18:00", does_overtime: false,
            }})
            const validTypes = await (await fetch(`${baseUrl}/punch-preview/valid-types?userId=${userId}`)).json()
            check("5x2 domingo sem overtime -> valid-types bloqueado", {
                expectedNextType: validTypes.expectedNextType, restDayPunchBlocked: validTypes.restDayPunchBlocked,
            }, { expectedNextType: null, restDayPunchBlocked: true })

            const postRes = await fetch(`${baseUrl}/time-records`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, type: "entrada" }),
            })
            check("5x2 domingo sem overtime -> POST entrada 400", postRes.status, 400)
        } finally { await cleanup(userId) }
    }

    // 2) 5x2, domingo, does_overtime=true, sem turno aberto -> permitido (fluxo antigo de hora extra em folga)
    {
        const { userId } = await makeUser("Teste Block 5x2 Com Overtime")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "5x2", entry_time: "08:00", exit_time: "18:00", does_overtime: true,
            }})
            const validTypes = await (await fetch(`${baseUrl}/punch-preview/valid-types?userId=${userId}`)).json()
            check("5x2 domingo com overtime -> valid-types liberado", {
                expectedNextType: validTypes.expectedNextType, restDayPunchBlocked: validTypes.restDayPunchBlocked,
            }, { expectedNextType: "entrada", restDayPunchBlocked: false })

            const postRes = await fetch(`${baseUrl}/time-records`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, type: "entrada", isOutOfRange: true, outOfRangeReason: "Chamado pra cobrir um plantão" }),
            })
            check("5x2 domingo com overtime -> POST entrada 201", postRes.status, 201)
        } finally { await cleanup(userId) }
    }

    // 3) 12x36, dia de TRABALHO -> nunca bloqueado (não é dia de folga)
    {
        const { userId } = await makeUser("Teste Block 12x36 Dia Trabalho")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "12x36", entry_time: "07:00", exit_time: "19:00", does_overtime: false,
                work_start_date: cuiabaInstant(today, { hours: 0, minutes: 0 }), // hoje = dia 0 = trabalho
            }})
            const postRes = await fetch(`${baseUrl}/time-records`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, type: "entrada" }),
            })
            check("12x36 dia de trabalho, sem overtime -> POST entrada 201 (nunca bloqueado)", postRes.status, 201)
        } finally { await cleanup(userId) }
    }

    // 4) 12x36, turno que COMEÇOU no dia de trabalho (sábado) e está fechando já
    // dentro do dia de folga (domingo de manhã) -> NUNCA bloqueado, mesmo sem
    // does_overtime, porque o turno já estava aberto (não é começar trabalho novo).
    {
        const { userId, token } = await makeUser("Teste Block 12x36 Turno Continuando")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "12x36", entry_time: "22:00", exit_time: "07:00", does_overtime: false,
                work_start_date: cuiabaInstant(yesterday, { hours: 0, minutes: 0 }), // ontem = dia 0 = trabalho, hoje = dia 1 = folga
            }})
            await prisma.timeRecord.create({ data: { user_id: userId, type: "entrada", timestamp: cuiabaInstant(yesterday, { hours: 22, minutes: 0 }) } })
            const validTypes = await (await fetch(`${baseUrl}/punch-preview/valid-types?userId=${userId}`)).json()
            check("12x36 turno aberto atravessando pra dentro da folga de hoje -> NÃO bloqueado, saída esperada", {
                expectedNextType: validTypes.expectedNextType, restDayPunchBlocked: validTypes.restDayPunchBlocked,
            }, { expectedNextType: "saida", restDayPunchBlocked: false })
        } finally { await cleanup(userId) }
    }

    // 5) 12x36, dia de folga (domingo) DE VERDADE, sem turno aberto nenhum, sem
    // does_overtime -> bloqueado (mesma regra do 5x2, escala diferente)
    {
        const { userId } = await makeUser("Teste Block 12x36 Folga Sem Turno")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "12x36", entry_time: "07:00", exit_time: "19:00", does_overtime: false,
                work_start_date: cuiabaInstant(yesterday, { hours: 0, minutes: 0 }), // hoje = dia 1 = folga
            }})
            const postRes = await fetch(`${baseUrl}/time-records`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, type: "entrada" }),
            })
            check("12x36 hoje é folga, sem turno aberto, sem overtime -> POST entrada 400", postRes.status, 400)
        } finally { await cleanup(userId) }
    }

    // 6) vigia -> nunca bloqueado, mesmo sem does_overtime (nunca tem folga programada)
    {
        const { userId } = await makeUser("Teste Block Vigia")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "vigia", does_overtime: false,
            }})
            const postRes = await fetch(`${baseUrl}/time-records`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, type: "entrada" }),
            })
            check("vigia, sem overtime, qualquer dia -> POST entrada 201 (nunca bloqueado)", postRes.status, 201)
        } finally { await cleanup(userId) }
    }

    console.log(`\n${passed} passaram, ${failed} falharam`)
    if (failed > 0) process.exit(1)
}

main().catch(err => { console.error("❌ FALHOU:", err); process.exit(1) }).finally(() => prisma.$disconnect())
