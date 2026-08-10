// Smoke test rápido dos fluxos NÃO tocados pela mudança do bloqueio de folga —
// confirma que dia normal de trabalho e hora extra econômica continuam intactos.
import { prisma } from "./src/lib/prisma"

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
    const { user } = await loginRes.json()
    return user.id as string
}

async function cleanup(userId: string) {
    await prisma.timeRecord.deleteMany({ where: { user_id: userId } })
    await prisma.user.delete({ where: { id: userId } })
}

async function main() {
    // Dia de trabalho garantido: 44h nunca tem work_start_date, mas tem folga fixa
    // sáb/dom — se hoje for dia de semana no relógio real, serve; senão usamos 12x36
    // ancorado em hoje (dia 0 = trabalho), que funciona em qualquer dia real.
    const { toCuiabaDateKey, cuiabaInstant } = await import("./src/lib/ponto-engine/cuiaba-time")
    const today = toCuiabaDateKey(new Date())

    // 1) Ciclo normal completo num dia de trabalho garantido (sem does_overtime)
    {
        const userId = await makeUser("Smoke Ciclo Normal")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "12x36", entry_time: "07:00", lunch_start: "11:00", lunch_end: "12:00", exit_time: "19:00",
                does_overtime: false, work_start_date: cuiabaInstant(today, { hours: 0, minutes: 0 }),
            }})
            const e = await fetch(`${baseUrl}/time-records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: "entrada" }) })
            check("entrada em dia de trabalho normal -> 201", e.status, 201)
            const as = await fetch(`${baseUrl}/time-records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: "almoco_saida" }) })
            check("almoco_saida -> 201", as.status, 201)
            const av = await fetch(`${baseUrl}/time-records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: "almoco_volta" }) })
            check("almoco_volta -> 201", av.status, 201)
            const s = await fetch(`${baseUrl}/time-records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: "saida" }) })
            const sBody = await s.json()
            check("saida -> 201, sem pendência de hora extra (não passou da carga)", { status: s.status, req: sBody.requires_overtime_justification }, { status: 201, req: false })
        } finally { await cleanup(userId) }
    }

    // 2) Hora extra econômica: does_overtime=true, excede a carga contratada -> exige justificativa
    {
        const userId = await makeUser("Smoke Overtime Economico")
        try {
            await prisma.user.update({ where: { id: userId }, data: {
                work_scale: "12x36", entry_time: "07:00", exit_time: "19:00", lunch_start: null, lunch_end: null,
                does_overtime: true, work_start_date: cuiabaInstant(today, { hours: 0, minutes: 0 }),
            }})
            // entrada "agora" (hoje 07:00 real não dá pra forçar via POST público, então
            // simulamos via Prisma direto uma entrada 13h atrás pra garantir excedente)
            await prisma.timeRecord.create({ data: { user_id: userId, type: "entrada", timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000) } })
            const preview = await (await fetch(`${baseUrl}/punch-preview?userId=${userId}&type=saida`)).json()
            check("preview saida com 13h trabalhadas (carga=12h) -> overtimePreview presente", !!preview.overtimePreview, true)

            const semJustificativa = await fetch(`${baseUrl}/time-records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: "saida" }) })
            check("saida sem justificativa de hora extra -> 400", semJustificativa.status, 400)

            const comJustificativa = await fetch(`${baseUrl}/time-records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, type: "saida", overtimeJustificationReason: "Cobrindo turno de colega" }) })
            const body = await comJustificativa.json()
            check("saida com justificativa -> 201, requires_overtime_justification true", { status: comJustificativa.status, req: body.requires_overtime_justification }, { status: 201, req: true })
        } finally { await cleanup(userId) }
    }

    console.log(`\n${passed} passaram, ${failed} falharam`)
    if (failed > 0) process.exit(1)
}

main().catch(err => { console.error("❌ FALHOU:", err); process.exit(1) }).finally(() => prisma.$disconnect())
