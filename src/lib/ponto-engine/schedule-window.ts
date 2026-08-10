import { cuiabaInstant, parseHHMM } from "./cuiaba-time";
import { EmployeeScheduleConfig, PunchType, TOLERANCE_MINUTES } from "./scale-config";

export type DeviationType =
    | "ENTRADA_ATRASADA"
    | "ENTRADA_ANTECIPADA"
    | "SAIDA_ANTECIPADA"
    | "SAIDA_TARDIA"
    | "ALMOCO_SAIDA_ANTECIPADA"
    | "ALMOCO_SAIDA_ATRASADA"
    | "ALMOCO_VOLTA_ANTECIPADA"
    | "ALMOCO_VOLTA_ATRASADA";

export interface Deviation {
    minutes: number;
    type: DeviationType;
}

export interface ComputeDeviationParams {
    punchType: PunchType;
    timestamp: Date;
    config: Pick<EmployeeScheduleConfig, "entryTime" | "lunchStart" | "lunchEnd" | "exitTime">;
    // Dia Cuiabá em que o TURNO começou — não necessariamente o dia da própria batida
    // (uma saída às 02:00 pertence ao turno que começou ontem à noite).
    shiftStartDateKey: string;
    // Reentrada após uma saída no mesmo dia (voltou de uma saída antecipada, abrindo
    // um SEGUNDO turno) não tem hora de entrada programada pra comparar — só a
    // primeira abertura de turno do dia é avaliada contra entryTime.
    isFirstEntradaOfShift?: boolean;
}

/**
 * Resolve os horários configurados (entryTime/lunchStart/lunchEnd/exitTime) em
 * instantes reais, ancorados no dia em que o turno começou — avançando um dia toda
 * vez que o próximo horário da sequência for numericamente menor que o anterior
 * (virada de meia-noite). Isso faz um turno 20:00→06:00 resolver a saída pro dia
 * seguinte automaticamente, sem precisar de nenhum flag "turno noturno" explícito.
 */
function resolveScheduledInstants(
    shiftStartDateKey: string,
    config: Pick<EmployeeScheduleConfig, "entryTime" | "lunchStart" | "lunchEnd" | "exitTime">
): Partial<Record<PunchType, Date>> {
    const sequence: { type: PunchType; hhmm: string | null | undefined }[] = [
        { type: "entrada", hhmm: config.entryTime },
        { type: "almoco_saida", hhmm: config.lunchStart },
        { type: "almoco_volta", hhmm: config.lunchEnd },
        { type: "saida", hhmm: config.exitTime },
    ];

    const result: Partial<Record<PunchType, Date>> = {};
    let dayOffset = 0;
    let prevMinutes: number | null = null;

    for (const { type, hhmm } of sequence) {
        if (!hhmm) continue;
        const parsed = parseHHMM(hhmm);
        if (!parsed) continue;
        const minutes = parsed.hours * 60 + parsed.minutes;
        if (prevMinutes !== null && minutes < prevMinutes) dayOffset += 1;
        result[type] = cuiabaInstant(shiftStartDateKey, parsed, dayOffset);
        prevMinutes = minutes;
    }

    return result;
}

function deviationTypeFor(punchType: PunchType, deviationMinutes: number): DeviationType {
    const late = deviationMinutes > 0;
    if (punchType === "entrada") return late ? "ENTRADA_ATRASADA" : "ENTRADA_ANTECIPADA";
    if (punchType === "saida") return late ? "SAIDA_TARDIA" : "SAIDA_ANTECIPADA";
    if (punchType === "almoco_saida") return late ? "ALMOCO_SAIDA_ATRASADA" : "ALMOCO_SAIDA_ANTECIPADA";
    return late ? "ALMOCO_VOLTA_ATRASADA" : "ALMOCO_VOLTA_ANTECIPADA";
}

/**
 * Compara a batida real com o horário programado (entrada/almoço/saída, os 4 tipos)
 * e aplica a janela de tolerância de 15min. Desvio bruto é armazenado (tolerância não
 * é descontada) — bate com o desvio de 1h completo pra uma entrada 1h atrasada.
 */
export function computeDeviation(params: ComputeDeviationParams): Deviation | null {
    const { punchType, timestamp, config, shiftStartDateKey, isFirstEntradaOfShift = true } = params;
    if (punchType === "entrada" && !isFirstEntradaOfShift) return null;

    const scheduled = resolveScheduledInstants(shiftStartDateKey, config);
    const scheduledInstant = scheduled[punchType];
    if (!scheduledInstant) return null;

    // Trunca os dois lados pro minuto cheio antes de subtrair (não arredonda a
    // diferença em ms) — mesma granularidade de minuto inteiro que o resto do
    // sistema usa pra exibir/comparar horários, evita diferença de 1min por causa
    // dos segundos da batida real.
    const actualMinutesTotal = Math.floor(timestamp.getTime() / 60000);
    const scheduledMinutesTotal = Math.floor(scheduledInstant.getTime() / 60000);
    const deviationMinutes = actualMinutesTotal - scheduledMinutesTotal;
    if (Math.abs(deviationMinutes) <= TOLERANCE_MINUTES) return null;

    return {
        minutes: Math.abs(deviationMinutes),
        type: deviationTypeFor(punchType, deviationMinutes),
    };
}
