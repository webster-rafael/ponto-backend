// superseded pelo ponto-engine (src/lib/ponto-engine/) — sem novos chamadores,
// mantido só pra não quebrar nada que ainda não migrou.
export const TOLERANCE_MINUTES = 15;

export type ScheduleDeviationType =
    | "ENTRADA_ATRASADA"
    | "ENTRADA_ANTECIPADA"
    | "SAIDA_ANTECIPADA"
    | "SAIDA_TARDIA";

export interface ScheduleDeviation {
    minutes: number;
    type: ScheduleDeviationType;
}

interface ComputeScheduleDeviationParams {
    type: string;
    timestamp: Date;
    entryTime?: string | null;
    exitTime?: string | null;
    // Reentrada após uma saída no mesmo dia (ex: voltou de uma saída antecipada) não
    // tem hora de entrada programada pra comparar — só a PRIMEIRA entrada do dia é
    // avaliada contra entryTime. Sem isso, uma volta às 16h vira "atraso" de horas.
    isFirstEntradaOfDay?: boolean;
}

function parseHHMM(value: string): { hours: number; minutes: number } | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return { hours, minutes };
}

// Servidor guarda tudo em UTC; horário programado (entry_time/exit_time) é em
// America/Cuiaba (UTC-4, sem horário de verão) — mesmo offset usado em work-schedule.ts.
function minutesOfDayInCuiaba(date: Date): number {
    const cuiaba = new Date(date.getTime() - 4 * 60 * 60 * 1000);
    return cuiaba.getUTCHours() * 60 + cuiaba.getUTCMinutes();
}

/**
 * Compara a batida real com o horário programado do colaborador e aplica a
 * janela de tolerância de 15 minutos. Só avalia 'entrada' (contra entryTime)
 * e 'saida' (contra exitTime); qualquer outro tipo, horário não configurado,
 * ou desvio dentro da tolerância (<= 15min) retorna null — dia computado
 * normalmente, sem pendência, igual ao "Caso 1" da regra de negócio.
 */
export function computeScheduleDeviation({
    type,
    timestamp,
    entryTime,
    exitTime,
    isFirstEntradaOfDay = true,
}: ComputeScheduleDeviationParams): ScheduleDeviation | null {
    if (type === "entrada" && !isFirstEntradaOfDay) return null;

    const scheduledTimeStr = type === "entrada" ? entryTime : type === "saida" ? exitTime : null;
    if (!scheduledTimeStr) return null;

    const scheduled = parseHHMM(scheduledTimeStr);
    if (!scheduled) return null;

    const scheduledMinutes = scheduled.hours * 60 + scheduled.minutes;
    const actualMinutes = minutesOfDayInCuiaba(timestamp);
    const deviationMinutes = actualMinutes - scheduledMinutes;

    if (Math.abs(deviationMinutes) <= TOLERANCE_MINUTES) return null;

    const deviationType: ScheduleDeviationType =
        type === "entrada"
            ? deviationMinutes > 0
                ? "ENTRADA_ATRASADA"
                : "ENTRADA_ANTECIPADA"
            : deviationMinutes > 0
            ? "SAIDA_TARDIA"
            : "SAIDA_ANTECIPADA";

    return {
        minutes: Math.abs(deviationMinutes),
        type: deviationType,
    };
}
