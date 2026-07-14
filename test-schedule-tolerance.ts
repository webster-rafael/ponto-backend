import { computeScheduleDeviation } from "./src/lib/schedule-tolerance"

// Horários programados: 07:00 às 18:00 (exemplos exatos do enunciado da regra de negócio)
// Datas em UTC representando o horário de Cuiabá (UTC-4): timestamp = horaCuiaba + 4h.
function cuiabaTime(hh: number, mm: number): Date {
    return new Date(Date.UTC(2026, 6, 14, hh + 4, mm, 0))
}

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

// Caso 1 do enunciado: dentro da tolerância (12 min de cada lado) — sem pendência
check(
    "entrada 07:12 (12min de atraso, dentro da tolerância) -> sem pendência",
    computeScheduleDeviation({ type: "entrada", timestamp: cuiabaTime(7, 12), entryTime: "07:00", exitTime: "18:00" }),
    null
)
check(
    "saida 17:48 (12min antes, dentro da tolerância) -> sem pendência",
    computeScheduleDeviation({ type: "saida", timestamp: cuiabaTime(17, 48), entryTime: "07:00", exitTime: "18:00" }),
    null
)

// Caso 2 do enunciado: fora da tolerância — pendência
check(
    "entrada 07:20 (20min de atraso) -> ENTRADA_ATRASADA 20min",
    computeScheduleDeviation({ type: "entrada", timestamp: cuiabaTime(7, 20), entryTime: "07:00", exitTime: "18:00" }),
    { minutes: 20, type: "ENTRADA_ATRASADA" }
)

// Entrada antecipada (6h em vez de 7h programado)
check(
    "entrada 06:00 (60min antes) -> ENTRADA_ANTECIPADA 60min",
    computeScheduleDeviation({ type: "entrada", timestamp: cuiabaTime(6, 0), entryTime: "07:00", exitTime: "18:00" }),
    { minutes: 60, type: "ENTRADA_ANTECIPADA" }
)

// Saída antecipada (17h em vez de 18h programado)
check(
    "saida 17:00 (60min antes) -> SAIDA_ANTECIPADA 60min",
    computeScheduleDeviation({ type: "saida", timestamp: cuiabaTime(17, 0), entryTime: "07:00", exitTime: "18:00" }),
    { minutes: 60, type: "SAIDA_ANTECIPADA" }
)

// Saída tardia (18:50 em vez de 18h programado)
check(
    "saida 18:50 (50min depois) -> SAIDA_TARDIA 50min",
    computeScheduleDeviation({ type: "saida", timestamp: cuiabaTime(18, 50), entryTime: "07:00", exitTime: "18:00" }),
    { minutes: 50, type: "SAIDA_TARDIA" }
)

// Limite exato de 15 minutos -> ainda dentro da tolerância (janela "até 15 minutos")
check(
    "entrada 07:15 (exatamente 15min) -> sem pendência (limite inclusivo)",
    computeScheduleDeviation({ type: "entrada", timestamp: cuiabaTime(7, 15), entryTime: "07:00", exitTime: "18:00" }),
    null
)
check(
    "entrada 07:16 (16min, 1min fora do limite) -> ENTRADA_ATRASADA 16min",
    computeScheduleDeviation({ type: "entrada", timestamp: cuiabaTime(7, 16), entryTime: "07:00", exitTime: "18:00" }),
    { minutes: 16, type: "ENTRADA_ATRASADA" }
)

// Horário não configurado -> sem pendência
check(
    "entrada sem entry_time configurado -> sem pendência",
    computeScheduleDeviation({ type: "entrada", timestamp: cuiabaTime(9, 0), entryTime: null, exitTime: "18:00" }),
    null
)

// Tipo não avaliado pela regra (almoço) -> sem pendência
check(
    "almoco_saida não é avaliado pela regra -> sem pendência",
    computeScheduleDeviation({ type: "almoco_saida", timestamp: cuiabaTime(11, 40), entryTime: "07:00", exitTime: "18:00" }),
    null
)

console.log(`\n${passed} passaram, ${failed} falharam`)
if (failed > 0) process.exit(1)
