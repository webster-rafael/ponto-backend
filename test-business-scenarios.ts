// Verifica os 6 cenários de negócio descritos pelo usuário, rodando contra o
// servidor real (não é só releitura do código). Turno: 5x2, entra 08:00, sai 18:00.
import { prisma } from "./src/lib/prisma"

const baseUrl = process.env.TEST_API_URL || "http://localhost:3300"

let passed = 0
let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    if (ok) { passed++; console.log(`✅ ${name}`) }
    else { failed++; console.error(`❌ ${name}\n   esperado: ${JSON.stringify(expected)}\n   obtido:   ${JSON.stringify(actual)}`) }
}

function cuiabaHHMM(offsetMinutes: number): string {
    const cuiaba = new Date(Date.now() - 4 * 60 * 60 * 1000 + offsetMinutes * 60 * 1000)
    const hh = String(cuiaba.getUTCHours()).padStart(2, "0")
    const mm = String(cuiaba.getUTCMinutes()).padStart(2, "0")
    return `${hh}:${mm}`
}

async function punch(userId: string, type: string) {
    const res = await fetch(`${baseUrl}/time-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type }),
    })
    return res.json()
}

async function resetDay(userId: string) {
    await prisma.timeRecord.deleteMany({ where: { user_id: userId } })
}

async function main() {
    console.log("🧪 Verificação dos 6 cenários de negócio (5x2, 08:00-18:00)\n")

    const companiesRes = await fetch(`${baseUrl}/companies`)
    const { companies } = await companiesRes.json()
    const companyId = companies[0].id

    const email = `test_scenarios_${Date.now()}@example.com`
    await fetch(`${baseUrl}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Teste Cenarios", email, password: "password123", companyId }),
    })
    const loginRes = await fetch(`${baseUrl}/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123", companyId }),
    })
    const { user } = await loginRes.json()
    const userId: string = user.id

    try {
        await prisma.user.update({ where: { id: userId }, data: { work_scale: "5x2" } })

        // ── Cenário 1: entrada 7:58 (-2min) e saída 17:50 (-10min) -> ambos dentro da tolerância ──
        await resetDay(userId)
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(2), exit_time: cuiabaHHMM(10) } })
        const s1e = await punch(userId, "entrada")
        check("Cenário 1 — entrada 2min antes: nada acontece (sem pendência)", {
            requires: s1e.requires_schedule_justification, type: s1e.schedule_deviation_type,
        }, { requires: false, type: null })
        const s1s = await punch(userId, "saida")
        check("Cenário 1 — saída 10min antes: nada acontece (sem pendência)", {
            requires: s1s.requires_schedule_justification, type: s1s.schedule_deviation_type,
        }, { requires: false, type: null })

        // ── Cenário 2: entrada 8:05 (+5min, ok) e saída 18:50 (+50min, hora extra) ──
        // Nota: o cenário original dizia "17:50", mas isso é 10min ANTES das 18:00 (dentro
        // da tolerância, igual ao cenário 1/3) — não bate com "libera botão de hora extra".
        // Testando como 18:50 (+50min), que é o exemplo de saída tardia do enunciado original.
        await resetDay(userId)
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(-5), exit_time: cuiabaHHMM(9999) } })
        const s2e = await punch(userId, "entrada")
        check("Cenário 2 — entrada 5min depois: nada acontece (sem pendência)", {
            requires: s2e.requires_schedule_justification, type: s2e.schedule_deviation_type,
        }, { requires: false, type: null })
        await prisma.user.update({ where: { id: userId }, data: { exit_time: cuiabaHHMM(-50) } })
        const s2s = await punch(userId, "saida")
        check("Cenário 2 — saída 50min depois (18:50): SAIDA_TARDIA, precisa justificar", {
            requires: s2s.requires_schedule_justification, type: s2s.schedule_deviation_type,
        }, { requires: true, type: "SAIDA_TARDIA" })

        // ── Cenário 3: entrada 8:04 (+4min, ok) e saída 17:30 (-30min, antecipada, sem hora extra) ──
        await resetDay(userId)
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(-4), exit_time: cuiabaHHMM(9999) } })
        const s3e = await punch(userId, "entrada")
        check("Cenário 3 — entrada 4min depois: tudo certo, sem pendência", {
            requires: s3e.requires_schedule_justification, type: s3e.schedule_deviation_type,
        }, { requires: false, type: null })
        await prisma.user.update({ where: { id: userId }, data: { exit_time: cuiabaHHMM(30) } })
        const s3s = await punch(userId, "saida")
        check("Cenário 3 — saída 30min antes: SAIDA_ANTECIPADA, precisa justificar", {
            requires: s3s.requires_schedule_justification, type: s3s.schedule_deviation_type,
        }, { requires: true, type: "SAIDA_ANTECIPADA" })

        // ── Cenário 4: entrada 8:40 (+40min, atraso) e saída 17:50 (-10min, ok) ──
        await resetDay(userId)
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(-40), exit_time: cuiabaHHMM(9999) } })
        const s4e = await punch(userId, "entrada")
        check("Cenário 4 — entrada 40min depois: ENTRADA_ATRASADA, precisa justificar", {
            requires: s4e.requires_schedule_justification, type: s4e.schedule_deviation_type,
        }, { requires: true, type: "ENTRADA_ATRASADA" })
        await prisma.user.update({ where: { id: userId }, data: { exit_time: cuiabaHHMM(10) } })
        const s4s = await punch(userId, "saida")
        check("Cenário 4 — saída 10min antes: finalizou corretamente, sem pendência", {
            requires: s4s.requires_schedule_justification, type: s4s.schedule_deviation_type,
        }, { requires: false, type: null })

        // Nota: "atraso/saída antecipada nunca viram hora extra" é verificado no cálculo
        // de horas do DASHBOARD (repositório separado do backend) — ver
        // dashboard/test-attendance-hours.ts, caso "atraso 1h + saída antecipada 1h".

        // ── Cenário 5: entrada atrasada + saída antecipada, ambas justificadas -> DUAS
        // justificativas pendentes no mesmo dia, nenhuma sobrescrevendo a outra. ──
        await resetDay(userId)
        await prisma.justification.deleteMany({ where: { user_id: userId } })
        await prisma.user.update({ where: { id: userId }, data: { entry_time: cuiabaHHMM(-40), exit_time: cuiabaHHMM(9999) } })
        await punch(userId, "entrada")
        await prisma.user.update({ where: { id: userId }, data: { exit_time: cuiabaHHMM(30) } })
        await punch(userId, "saida")
        const today = new Date().toISOString().split("T")[0]
        await fetch(`${baseUrl}/justifications`, {
            method: "POST",
            headers: { Authorization: `Bearer ${(await (await fetch(`${baseUrl}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password123", companyId }) })).json()).token}` },
            body: (() => { const f = new FormData(); f.append("date", today); f.append("description", "Atraso: transito"); return f })(),
        })
        await fetch(`${baseUrl}/justifications`, {
            method: "POST",
            headers: { Authorization: `Bearer ${(await (await fetch(`${baseUrl}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password123", companyId }) })).json()).token}` },
            body: (() => { const f = new FormData(); f.append("date", today); f.append("description", "Saída antecipada: medico"); return f })(),
        })
        const dayJustifications = await prisma.justification.findMany({ where: { user_id: userId } })
        check("Cenário 5 — duas justificativas no mesmo dia, ambas PENDING (nenhuma sumiu)", {
            count: dayJustifications.length,
            statuses: dayJustifications.map(j => j.status).sort(),
        }, { count: 2, statuses: ["PENDING", "PENDING"] })

        // ── Cenário 6: entrada atrasada (justificada), saída no horário, reentrada bem
        // depois do exit_time -> é hora extra de verdade (SAIDA_TARDIA no preview da saída
        // original é o que decide o botão "Hora Extra" no app, ver getNextTypeInfo). ──
        await prisma.user.update({ where: { id: userId }, data: { exit_time: cuiabaHHMM(-120) } }) // exit_time há 2h atrás
        const pReentry = await fetch(`${baseUrl}/punch-preview?userId=${userId}&type=saida`)
        const pdReentry = await pReentry.json()
        check("Cenário 6 — reentrada bem depois do exit_time -> SAIDA_TARDIA (botão Hora Extra libera)", pdReentry.scheduleDeviation?.type, "SAIDA_TARDIA")

    } finally {
        await prisma.timeRecord.deleteMany({ where: { user_id: userId } })
        await prisma.justification.deleteMany({ where: { user_id: userId } })
        await prisma.user.delete({ where: { id: userId } })
    }

    console.log(`\n${passed} passaram, ${failed} falharam`)
    if (failed > 0) process.exit(1)
}

main().catch(err => { console.error("❌ TESTE FALHOU:", err); process.exit(1) }).finally(() => prisma.$disconnect())
