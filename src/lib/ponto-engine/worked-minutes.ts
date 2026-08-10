import { ShiftRecord } from "./shift-grouping";

export interface WorkedInterval {
    start: Date;
    end: Date;
    openRecordId: string;
    closeRecordId: string;
}

const OPEN_TYPES = new Set(["entrada", "almoco_volta"]);
const CLOSE_TYPES = new Set(["almoco_saida", "saida"]);

/**
 * Pareia registros "abre" (entrada/almoco_volta) com "fecha" (almoco_saida/saida) de
 * um TURNO (não um dia calendário pré-filtrado) — por isso um intervalo que atravessa
 * a meia-noite vira um intervalo só, em vez de dois pedaços truncados.
 */
export function buildWorkedIntervals(shiftRecords: ShiftRecord[]): WorkedInterval[] {
    const sorted = [...shiftRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const intervals: WorkedInterval[] = [];
    let open: ShiftRecord | null = null;

    for (const record of sorted) {
        if (OPEN_TYPES.has(record.type)) {
            // Se dois "abrem" seguidos (dado inconsistente), mantém o mais antigo
            // pra não perder tempo decorrido.
            if (!open) open = record;
            continue;
        }
        if (CLOSE_TYPES.has(record.type) && open) {
            if (record.timestamp.getTime() > open.timestamp.getTime()) {
                intervals.push({
                    start: open.timestamp,
                    end: record.timestamp,
                    openRecordId: open.id,
                    closeRecordId: record.id,
                });
            }
            open = null;
        }
    }

    return intervals;
}

export function totalWorkedMinutes(intervals: WorkedInterval[]): number {
    return intervals.reduce((sum, i) => sum + (i.end.getTime() - i.start.getTime()) / 60000, 0);
}
