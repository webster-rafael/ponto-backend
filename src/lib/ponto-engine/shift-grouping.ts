import { toCuiabaDateKey } from "./cuiaba-time";
import { hasScheduledRestDayGap } from "./rest-day";
import { EmployeeScheduleConfig } from "./scale-config";

export interface ShiftRecord {
    id: string;
    type: string;
    timestamp: Date;
}

export interface Shift {
    // Dia Cuiabá em que o turno COMEÇOU (a entrada) — um turno que atravessa a
    // meia-noite pertence inteiro a esse dia, nunca é dividido em dois.
    startDateKey: string;
    records: ShiftRecord[];
    isOpen: boolean;
}

/**
 * Agrupa registros (ordem qualquer) em turnos: um turno começa numa 'entrada' e
 * termina na 'saida' seguinte (ou fica aberto se ainda não fechou — sem limite de
 * tempo: existem escalas onde o turno genuinamente fica aberto por dias, ex. um
 * vigia em viagem que só bate a saída depois de 2-3 dias). Formaliza o truque já
 * usado em fetch-active-shift.ts, mas produzindo todos os turnos da janela, não só o
 * mais recente — necessário pra saber se um turno é a primeira abertura do dia
 * (reentrada não deve ser cobrada como atraso) e pra atribuir corretamente um turno
 * noturno/multi-dia ao dia em que começou.
 *
 * Além do fechamento normal (entrada após uma saída), a cadeia TAMBÉM quebra quando
 * há um dia de folga programado inteiro entre dois registros consecutivos — sem
 * isso, um turno esquecido sem saída (ex: 12x36 que bate entrada, esquece a saída,
 * folga de verdade no dia seguinte, e volta a trabalhar dois dias depois) ficaria
 * mesclado com o turno novo, contando a folga inteira como trabalhada/hora extra.
 * Não afeta turnos que atravessam a virada pra um dia de folga sem um dia INTEIRO no
 * meio (turno noturno legítimo) nem `vigia` (nunca tem folga programada).
 */
export function groupIntoShifts(
    records: ShiftRecord[],
    config: Pick<EmployeeScheduleConfig, "workScale" | "workStartDate">
): Shift[] {
    const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const shifts: Shift[] = [];
    let current: ShiftRecord[] = [];

    for (const record of sorted) {
        const lastInCurrent = current[current.length - 1];
        if (lastInCurrent) {
            const closesNormally = record.type === "entrada" && lastInCurrent.type === "saida";
            const abandonedAcrossRestDay = hasScheduledRestDayGap(config, lastInCurrent.timestamp, record.timestamp);
            if (closesNormally || abandonedAcrossRestDay) {
                shifts.push(buildShift(current));
                current = [];
            }
        }
        current.push(record);
    }
    if (current.length > 0) shifts.push(buildShift(current));

    return shifts;
}

function buildShift(records: ShiftRecord[]): Shift {
    const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const opening = sorted.find(r => r.type === "entrada") ?? sorted[0];
    const last = sorted[sorted.length - 1];
    return {
        startDateKey: toCuiabaDateKey(opening.timestamp),
        records: sorted,
        isOpen: last.type !== "saida",
    };
}

// Itera de trás pra frente: com a quebra por dia de folga acima, um turno antigo
// abandonado (nunca fechado) pode continuar isOpen=true na lista ao lado de um
// turno novo também aberto — o "aberto" que importa pro app é sempre o mais
// recente, o antigo fica só como pendência histórica sem saída.
export function findOpenShift(shifts: Shift[]): Shift | undefined {
    for (let i = shifts.length - 1; i >= 0; i--) {
        if (shifts[i].isOpen) return shifts[i];
    }
    return undefined;
}
