import { diffInCuiabaCalendarDays, parseHHMM, toCuiabaDateKey } from "./cuiaba-time";
import { computeIsRestDay } from "./rest-day";
import { EmployeeScheduleConfig, TOLERANCE_MINUTES } from "./scale-config";
import { groupIntoShifts, Shift, ShiftRecord } from "./shift-grouping";
import { buildWorkedIntervals, totalWorkedMinutes, WorkedInterval } from "./worked-minutes";

export interface DaySummaryTimeRecord {
    id: string;
    type: string;
    timestamp: Date;
    is_out_of_range: boolean;
    out_of_range_status: string;
    out_of_range_reason: string | null;
    requires_schedule_justification: boolean;
    schedule_deviation_minutes: number | null;
    schedule_deviation_type: string | null;
    requires_overtime_justification: boolean;
    overtime_minutes: number | null;
    overtime_justification_status: string | null;
}

export interface DaySummaryJustification {
    date: Date;
    status: string;
}

export interface PendingItem {
    kind: "SCHEDULE_DEVIATION" | "REST_DAY_OVERTIME" | "OUT_OF_RANGE" | "OVERTIME_TOTAL";
    recordId: string;
    status: string;
}

export interface DaySummary {
    date: string;
    isRestDay: boolean;
    isBeforeWorkStart: boolean;
    records: { id: string; type: string; timestamp: string }[];
    normalMinutes: number;
    extraMinutes: number;
    balanceMinutes: number;
    pendingJustifications: PendingItem[];
}

function isBeforeWorkStart(config: Pick<EmployeeScheduleConfig, "workStartDate">, dateKey: string): boolean {
    if (!config.workStartDate) return false;
    return diffInCuiabaCalendarDays(new Date(`${dateKey}T12:00:00.000Z`), config.workStartDate) < 0;
}

function isDayJustifiedApproved(justifications: DaySummaryJustification[], dateKey: string): boolean {
    return justifications.some((j) => toCuiabaDateKey(j.date) === dateKey && j.status === "APPROVED");
}

function isRecordApproved(record: DaySummaryTimeRecord, dayJustifiedApproved: boolean): boolean {
    if (record.is_out_of_range) return record.out_of_range_status === "APPROVED";
    return dayJustifiedApproved;
}

/**
 * Recorta os intervalos trabalhados do turno contra a janela programada
 * (entry_time/exit_time, tolerância de 15min) — mesma filosofia já validada no
 * dashboard (dashboard/src/lib/attendance-hours.ts computeDayMinutes), reescrita do
 * zero aqui operando sobre os intervalos de um TURNO (não um dia calendário
 * pré-filtrado), o que corrige turnos noturnos que antes ficavam truncados em dois
 * pedaços. O que cai fora da janela só vira hora extra depois de aprovado — antes
 * disso fica de fora do total (nem normal, nem extra).
 */
function computeWindowClippedMinutes(
    intervals: WorkedInterval[],
    recordsById: Map<string, DaySummaryTimeRecord>,
    windowStart: number,
    windowEnd: number,
    dayJustifiedApproved: boolean
): { normalMinutes: number; extraMinutes: number } {
    const toleranceMs = TOLERANCE_MINUTES * 60000;
    let normalMinutes = 0;
    let extraMinutes = 0;

    for (const interval of intervals) {
        const s = interval.start.getTime();
        const e = interval.end.getTime();

        const beforeMinutes = Math.max(0, Math.min(e, windowStart) - s) / 60000;
        const normStart = Math.max(s, windowStart);
        const normEnd = Math.min(e, windowEnd);
        normalMinutes += Math.max(0, normEnd - normStart) / 60000;
        const afterMinutes = Math.max(0, e - Math.max(s, windowEnd)) / 60000;

        const openRecord = recordsById.get(interval.openRecordId);
        const closeRecord = recordsById.get(interval.closeRecordId);

        if (beforeMinutes * 60000 <= toleranceMs) {
            normalMinutes += beforeMinutes;
        } else if (openRecord && isRecordApproved(openRecord, dayJustifiedApproved)) {
            extraMinutes += beforeMinutes;
        }

        if (afterMinutes * 60000 <= toleranceMs) {
            normalMinutes += afterMinutes;
        } else if (closeRecord && isRecordApproved(closeRecord, dayJustifiedApproved)) {
            extraMinutes += afterMinutes;
        }
    }

    return { normalMinutes, extraMinutes };
}

function buildPendingItems(records: DaySummaryTimeRecord[]): PendingItem[] {
    const items: PendingItem[] = [];
    for (const r of records) {
        if (r.requires_schedule_justification) {
            items.push({
                kind: "SCHEDULE_DEVIATION",
                recordId: r.id,
                status: r.is_out_of_range ? r.out_of_range_status : "PENDING",
            });
        }
        if (r.is_out_of_range) {
            items.push({
                kind: r.out_of_range_reason?.startsWith("Hora extra em dia de folga") ? "REST_DAY_OVERTIME" : "OUT_OF_RANGE",
                recordId: r.id,
                status: r.out_of_range_status,
            });
        }
        if (r.requires_overtime_justification) {
            items.push({ kind: "OVERTIME_TOTAL", recordId: r.id, status: r.overtime_justification_status ?? "PENDING" });
        }
    }
    return items;
}

/**
 * Monta o resumo dia-a-dia de um colaborador pra um intervalo [fromDateKey,
 * toDateKey] — usado tanto pelo export individual quanto pela Folha de Presença em
 * lote. `records` deve cobrir uma janela com folga antes/depois do intervalo (pra
 * turnos que atravessam a virada do intervalo não ficarem cortados).
 */
export function buildDaySummaries(params: {
    fromDateKey: string;
    toDateKey: string;
    records: DaySummaryTimeRecord[];
    justifications: DaySummaryJustification[];
    config: EmployeeScheduleConfig;
}): DaySummary[] {
    const { fromDateKey, toDateKey, records, justifications, config } = params;

    const shiftRecords: ShiftRecord[] = records.map((r) => ({ id: r.id, type: r.type, timestamp: r.timestamp }));
    const shifts = groupIntoShifts(shiftRecords, config);
    const recordsById = new Map(records.map((r) => [r.id, r]));
    const shiftsByDateKey = new Map<string, Shift[]>();
    for (const shift of shifts) {
        const list = shiftsByDateKey.get(shift.startDateKey) ?? [];
        list.push(shift);
        shiftsByDateKey.set(shift.startDateKey, list);
    }

    const entryHHMM = config.entryTime ? parseHHMM(config.entryTime) : null;
    const exitHHMM = config.exitTime ? parseHHMM(config.exitTime) : null;
    const entryMinutes = entryHHMM ? entryHHMM.hours * 60 + entryHHMM.minutes : null;
    const exitMinutes = exitHHMM ? exitHHMM.hours * 60 + exitHHMM.minutes : null;

    const summaries: DaySummary[] = [];
    for (let cursor = new Date(`${fromDateKey}T12:00:00.000Z`); toCuiabaDateKey(cursor) <= toDateKey; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
        const dateKey = toCuiabaDateKey(cursor);
        const dayShifts = shiftsByDateKey.get(dateKey) ?? [];
        const dayRecordEntities = dayShifts.flatMap((s) => s.records.map((r) => recordsById.get(r.id)!).filter(Boolean));
        const dayIntervals = dayShifts.flatMap((s) => buildWorkedIntervals(s.records));
        const total = totalWorkedMinutes(dayIntervals);

        const restDay = computeIsRestDay(config, cursor);
        const beforeStart = isBeforeWorkStart(config, dateKey);

        let normalMinutes = 0;
        let extraMinutes = 0;
        let balanceMinutes = 0;

        if (restDay) {
            extraMinutes = total;
            balanceMinutes = total;
        } else if (entryMinutes == null || exitMinutes == null) {
            normalMinutes = total;
        } else {
            const windowStart = new Date(`${dateKey}T00:00:00.000Z`).getTime() + 4 * 60 * 60 * 1000 + entryMinutes * 60000;
            // Turno noturno (exit <= entry em minutos-do-dia): janela de saída cai no
            // dia seguinte — mesma convenção de overtime.ts/schedule-window.ts.
            const windowEndSameDayMinutes = exitMinutes <= entryMinutes ? exitMinutes + 24 * 60 : exitMinutes;
            const windowEnd = new Date(`${dateKey}T00:00:00.000Z`).getTime() + 4 * 60 * 60 * 1000 + windowEndSameDayMinutes * 60000;
            const dayJustifiedApproved = isDayJustifiedApproved(justifications, dateKey);
            const clipped = computeWindowClippedMinutes(dayIntervals, recordsById, windowStart, windowEnd, dayJustifiedApproved);
            normalMinutes = clipped.normalMinutes;
            extraMinutes = clipped.extraMinutes;
            balanceMinutes = total - Math.max(0, (windowEnd - windowStart) / 60000);
        }

        // does_overtime=true substitui a coluna única de "Hora Extra" pelo novo cálculo
        // (excedente sobre a carga contratada, já computado e persistido na batida de
        // saída) em vez do cálculo de janela acima — decisão #6 do plano: uma coluna só.
        if (config.doesOvertime) {
            const overtimeRecords = dayRecordEntities.filter((r) => r.requires_overtime_justification);
            const approvedOvertimeMinutes = overtimeRecords
                .filter((r) => r.overtime_justification_status === "APPROVED")
                .reduce((sum, r) => sum + (r.overtime_minutes ?? 0), 0);
            const pendingOrRejectedOvertimeMinutes = overtimeRecords
                .filter((r) => r.overtime_justification_status !== "APPROVED")
                .reduce((sum, r) => sum + (r.overtime_minutes ?? 0), 0);

            if (!restDay) {
                extraMinutes = approvedOvertimeMinutes;
                normalMinutes = Math.max(0, total - approvedOvertimeMinutes - pendingOrRejectedOvertimeMinutes);
            }
        }

        summaries.push({
            date: dateKey,
            isRestDay: restDay,
            isBeforeWorkStart: beforeStart,
            records: dayRecordEntities.map((r) => ({ id: r.id, type: r.type, timestamp: r.timestamp.toISOString() })),
            normalMinutes,
            extraMinutes,
            balanceMinutes,
            pendingJustifications: buildPendingItems(dayRecordEntities),
        });
    }

    return summaries;
}
