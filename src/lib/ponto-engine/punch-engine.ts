import { toCuiabaDateKey } from "./cuiaba-time";
import { computeOvertimeForClosedShift } from "./overtime";
import { computeIsRestDay, hasScheduledRestDayGap } from "./rest-day";
import { EmployeeScheduleConfig, hasLunch, isPunchType, PunchType } from "./scale-config";
import { computeDeviation, Deviation } from "./schedule-window";
import { findOpenShift, groupIntoShifts, Shift, ShiftRecord } from "./shift-grouping";
import { buildWorkedIntervals, totalWorkedMinutes } from "./worked-minutes";

export interface EvaluatePunchInput {
    punchType: PunchType;
    timestamp: Date;
    config: EmployeeScheduleConfig;
    // Janela de registros recentes do colaborador (qualquer ordem) — usada pra
    // reconstruir os turnos e decidir tudo abaixo. O chamador escolhe o tamanho da
    // janela (recomendado: 48h, cobre folgamente até a escala 24x48).
    recentRecords: ShiftRecord[];
}

export interface EvaluatePunchResult {
    isRestDay: boolean;
    scheduleDeviation: Deviation | null;
    // Tipos já batidos no turno aberto atual — regra dura: repetir um desses é
    // batida duplicada, não uma questão de ordem (o chamador deve rejeitar).
    usedPunchTypes: PunchType[];
    // Próximo tipo "esperado" pela sequência normal — usado só como aviso no
    // cliente, nunca pra bloquear.
    expectedNextType: PunchType | null;
    // Só não-nulo quando punchType === 'saida' fecha um turno aberto e o excedente
    // sobre a carga contratada (para quem tem does_overtime) passa da tolerância.
    overtimePreview: { minutes: number } | null;
}

function computeExpectedNextType(openShift: Shift | undefined, config: EmployeeScheduleConfig): PunchType | null {
    if (!openShift || openShift.records.length === 0) return "entrada";
    const last = openShift.records[openShift.records.length - 1].type;
    const withLunch = hasLunch(config);
    if (last === "entrada") return withLunch ? "almoco_saida" : "saida";
    if (last === "almoco_saida") return "almoco_volta";
    if (last === "almoco_volta") return "saida";
    return null;
}

export function evaluatePunch(input: EvaluatePunchInput): EvaluatePunchResult {
    const { punchType, timestamp, config, recentRecords } = input;
    const shifts = groupIntoShifts(recentRecords, config);
    let openShift = findOpenShift(shifts);

    // O turno aberto encontrado no histórico pode já estar abandonado a essa
    // altura: se um dia de folga programado inteiro se passou entre a última
    // batida dele e AGORA (o momento dessa prévia/batida), ele deixa de contar
    // como o turno atual — o colaborador está começando um turno novo, mesmo sem
    // nunca ter fechado o antigo com uma saída.
    if (openShift) {
        const lastRecordTimestamp = openShift.records[openShift.records.length - 1].timestamp;
        if (hasScheduledRestDayGap(config, lastRecordTimestamp, timestamp)) {
            openShift = undefined;
        }
    }

    const shiftStartDateKey = openShift ? openShift.startDateKey : toCuiabaDateKey(timestamp);
    const usedPunchTypes = Array.from(
        new Set(openShift?.records.map(r => r.type).filter(isPunchType) ?? [])
    ) as PunchType[];
    const expectedNextType = computeExpectedNextType(openShift, config);

    // Dia de folga é decidido pelo dia em que o TURNO começou — um turno
    // sexta-23h→sábado-01h é julgado pela sexta, não pelo sábado.
    const restDayReferenceDate = openShift ? openShift.records[0].timestamp : timestamp;
    const isRestDay = computeIsRestDay(config, restDayReferenceDate);

    // Uma entrada só é "primeira do turno" pra fins de desvio se: (a) o turno aberto
    // atual ainda não tem uma entrada registrada (evita comparar contra entryTime uma
    // pré-visualização de uma entrada JÁ batida no turno — isso é uma duplicata, quem
    // rejeita é a regra dura de usedPunchTypes, não faz sentido gerar um desvio aqui),
    // e (b) nenhum outro turno já começou hoje (senão é reentrada após saída
    // antecipada, que não tem horário programado pra comparar).
    let isFirstEntradaOfShift = true;
    if (punchType === "entrada") {
        if (usedPunchTypes.includes("entrada")) {
            isFirstEntradaOfShift = false;
        } else if (!openShift) {
            isFirstEntradaOfShift = !shifts.some(s => s.startDateKey === shiftStartDateKey);
        }
    }

    const scheduleDeviation = config.workScale === "vigia" || isRestDay
        ? null
        : computeDeviation({
            punchType,
            timestamp,
            config,
            shiftStartDateKey,
            isFirstEntradaOfShift,
        });

    let overtimePreview: { minutes: number } | null = null;
    if (punchType === "saida" && openShift) {
        const hypotheticalRecords: ShiftRecord[] = [
            ...openShift.records,
            { id: "__preview__", type: "saida", timestamp },
        ];
        const intervals = buildWorkedIntervals(hypotheticalRecords);
        const workedMinutes = totalWorkedMinutes(intervals);
        overtimePreview = computeOvertimeForClosedShift({ shiftWorkedMinutes: workedMinutes, config });
    }

    return { isRestDay, scheduleDeviation, usedPunchTypes, expectedNextType, overtimePreview };
}
