import { parseHHMM } from "./cuiaba-time";
import { EmployeeScheduleConfig, TOLERANCE_MINUTES } from "./scale-config";

/**
 * Carga diária contratada em minutos: (saída - entrada) menos o almoço configurado,
 * resolvidos num dia de referência sintético com a mesma virada de meia-noite de
 * schedule-window.ts (saída numericamente <= entrada = turno noturno). Retorna null
 * se entrada/saída não estiverem configuradas — nesse caso não dá pra saber a carga
 * contratada, então hora extra nunca é calculada (ver computeOvertimeForClosedShift).
 */
export function computeContractedDailyMinutes(
    config: Pick<EmployeeScheduleConfig, "entryTime" | "lunchStart" | "lunchEnd" | "exitTime">
): number | null {
    if (!config.entryTime || !config.exitTime) return null;
    const entry = parseHHMM(config.entryTime);
    const exit = parseHHMM(config.exitTime);
    if (!entry || !exit) return null;

    const entryMinutes = entry.hours * 60 + entry.minutes;
    let exitMinutes = exit.hours * 60 + exit.minutes;
    if (exitMinutes <= entryMinutes) exitMinutes += 24 * 60; // turno atravessa a meia-noite

    let totalMinutes = exitMinutes - entryMinutes;

    if (config.lunchStart && config.lunchEnd) {
        const lunchStart = parseHHMM(config.lunchStart);
        const lunchEnd = parseHHMM(config.lunchEnd);
        if (lunchStart && lunchEnd) {
            let lunchStartMinutes = lunchStart.hours * 60 + lunchStart.minutes;
            let lunchEndMinutes = lunchEnd.hours * 60 + lunchEnd.minutes;
            if (lunchStartMinutes < entryMinutes) lunchStartMinutes += 24 * 60;
            if (lunchEndMinutes < lunchStartMinutes) lunchEndMinutes += 24 * 60;
            totalMinutes -= lunchEndMinutes - lunchStartMinutes;
        }
    }

    return totalMinutes > 0 ? totalMinutes : null;
}

/**
 * Hora extra só existe pra colaboradores com does_overtime=true, e só começa a contar
 * quando o total trabalhado no turno passa a carga contratada em MAIS de 15min (mesma
 * régua de tolerância de entrada/saída — ex: 5x2 que sai 14min depois do previsto não
 * conta como extra, 16min conta). Quando conta, o excedente bruto todo é retornado
 * (não só o que passa dos 15min).
 */
export function computeOvertimeForClosedShift(params: {
    shiftWorkedMinutes: number;
    config: EmployeeScheduleConfig;
}): { minutes: number } | null {
    const { shiftWorkedMinutes, config } = params;
    if (!config.doesOvertime) return null;

    const contracted = computeContractedDailyMinutes(config);
    if (contracted == null) return null;

    const excess = shiftWorkedMinutes - contracted;
    if (excess <= TOLERANCE_MINUTES) return null;

    return { minutes: Math.round(excess) };
}
