// Testa a regra de tolerância de 15min ponta-a-ponta: HTTP -> use-case -> Prisma real.
// Cria um usuário de teste descartável, ajusta entry_time/exit_time relativos ao
// horário atual (o backend sempre usa o relógio do servidor, o timestamp do
// cliente é ignorado por design anti-fraude), bate o ponto via POST /time-records
// e confere os campos persistidos via GET /time-records. Remove o usuário de
// teste ao final.
import { prisma } from "./src/lib/prisma"

const baseUrl = process.env.TEST_API_URL || "http://localhost:3300"

let passed = 0
let failed = 0

function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    if (ok) {
        passed++
        console.log(`✅ ${name}`)
    } else {
        failed++
        console.error(`❌ ${name}\n   esperado: ${JSON.stringify(expected)}\n   obtido:   ${JSON.stringify(actual)}`)
    }
}

// Formata "agora + offsetMinutes" como "HH:MM" no fuso de Cuiabá (UTC-4).
function cuiabaHHMM(offsetMinutes: number): string {
    const cuiaba = new Date(Date.now() - 4 * 60 * 60 * 1000 + offsetMinutes * 60 * 1000)
    const hh = String(cuiaba.getUTCHours()).padStart(2, "0")
    const mm = String(cuiaba.getUTCMinutes()).padStart(2, "0")
    return `${hh}:${mm}`
}

function todayCuiabaKey(): string {
    const cuiaba = new Date(Date.now() - 4 * 60 * 60 * 1000)
    return `${cuiaba.getUTCFullYear()}-${String(cuiaba.getUTCMonth() + 1).padStart(2, "0")}-${String(cuiaba.getUTCDate()).padStart(2, "0")}`
}

async function main() {
    console.log("🧪 Teste de integração: tolerância de 15min de entrada/saída\n")

    const companiesRes = await fetch(`${baseUrl}/companies`)
    const { companies } = await companiesRes.json()
    if (!companies?.length) throw new Error("Nenhuma empresa encontrada para o teste")
    const companyId = companies[0].id

    const email = `test_schedule_tolerance_${Date.now()}@example.com`
    const password = "password123"

    const registerRes = await fetch(`${baseUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Teste Tolerancia", email, password, companyId }),
    })
    if (registerRes.status !== 201) throw new Error(`Falha ao registrar usuário de teste: ${await registerRes.text()}`)

    const loginRes = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, companyId }),
    })
    const loginData = await loginRes.json()
    if (loginRes.status !== 200 || !loginData.token) throw new Error(`Falha no login: ${JSON.stringify(loginData)}`)

    const token: string = loginData.token
    const userId: string = loginData.user.id

    try {
        // Caso 1: entrada 12min "atrasada" em relação ao entry_time -> dentro da tolerância, sem pendência.
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(-12), exit_time: "23:59" } })
        const r1 = await fetch(`${baseUrl}/time-records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, type: "entrada" }),
        })
        const rec1 = await r1.json()
        check("entrada 12min dentro da tolerância -> sem pendência", {
            minutes: rec1.schedule_deviation_minutes,
            type: rec1.schedule_deviation_type,
            requires: rec1.requires_schedule_justification,
        }, { minutes: null, type: null, requires: false })

        // Caso 2: entrada 20min atrasada -> pendência ENTRADA_ATRASADA.
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(-20) } })
        const r2 = await fetch(`${baseUrl}/time-records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, type: "entrada" }),
        })
        const rec2 = await r2.json()
        check("entrada 20min atrasada -> ENTRADA_ATRASADA, pendência", {
            minutes: rec2.schedule_deviation_minutes,
            type: rec2.schedule_deviation_type,
            requires: rec2.requires_schedule_justification,
        }, { minutes: 20, type: "ENTRADA_ATRASADA", requires: true })

        // Caso 3: saída 30min antes do horário programado -> SAIDA_ANTECIPADA.
        await prisma.user.update({ where: { id: userId }, data: { exit_time: cuiabaHHMM(30) } })
        const r3 = await fetch(`${baseUrl}/time-records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, type: "saida" }),
        })
        const rec3 = await r3.json()
        check("saída 30min antecipada -> SAIDA_ANTECIPADA, pendência", {
            minutes: rec3.schedule_deviation_minutes,
            type: rec3.schedule_deviation_type,
            requires: rec3.requires_schedule_justification,
        }, { minutes: 30, type: "SAIDA_ANTECIPADA", requires: true })

        // Caso 4: usuário vigia -> regra não se aplica mesmo com desvio grande.
        await prisma.user.update({ where: { id: userId }, data: { work_scale: "vigia", entry_time: cuiabaHHMM(-60) } })
        const r4 = await fetch(`${baseUrl}/time-records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, type: "entrada" }),
        })
        const rec4 = await r4.json()
        check("usuário vigia -> regra de tolerância não se aplica", {
            minutes: rec4.schedule_deviation_minutes,
            type: rec4.schedule_deviation_type,
            requires: rec4.requires_schedule_justification,
        }, { minutes: null, type: null, requires: false })

        // Confere também via GET /time-records que os campos persistiram corretamente.
        const listRes = await fetch(`${baseUrl}/time-records?userId=${userId}&date=${todayCuiabaKey()}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        const list = await listRes.json()
        const persisted = list.find((r: any) => r.id === rec2.id)
        check("GET /time-records reflete o desvio persistido do caso 2", {
            minutes: persisted?.schedule_deviation_minutes,
            type: persisted?.schedule_deviation_type,
        }, { minutes: 20, type: "ENTRADA_ATRASADA" })
    } finally {
        // Limpa os dados de teste para não poluir o banco compartilhado.
        await prisma.timeRecord.deleteMany({ where: { user_id: userId } })
        await prisma.user.delete({ where: { id: userId } })
    }

    console.log(`\n${passed} passaram, ${failed} falharam`)
    if (failed > 0) process.exit(1)
}

main()
    .catch((err) => {
        console.error("\n❌ TESTE FALHOU:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
