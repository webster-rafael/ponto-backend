import { describe, expect, it } from "vitest";
import { buildDaySummaries, DaySummaryTimeRecord } from "./day-summary";
import { EmployeeScheduleConfig } from "./scale-config";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Constrói um registro de ponto num horário "HH:MM" de Cuiabá (UTC-4) num dia dado. */
function mkRecord(
    id: string,
    type: string,
    dateKey: string,
    hhmm: string,
    overrides: Partial<DaySummaryTimeRecord> = {}
): DaySummaryTimeRecord {
    const [h, m] = hhmm.split(":").map(Number);
    const [y, mo, d] = dateKey.split("-").map(Number);
    // Meia-noite em Cuiabá = 04:00 UTC do mesmo dia.
    const timestamp = new Date(Date.UTC(y, mo - 1, d, h + 4, m, 0, 0));
    return {
        id,
        type,
        timestamp,
        is_out_of_range: false,
        out_of_range_status: "APPROVED",
        out_of_range_reason: null,
        requires_schedule_justification: false,
        schedule_deviation_minutes: null,
        schedule_deviation_type: null,
        requires_overtime_justification: false,
        overtime_minutes: null,
        overtime_justification_status: null,
        ...overrides,
    };
}

function mkConfig(overrides: Partial<EmployeeScheduleConfig> = {}): EmployeeScheduleConfig {
    return {
        workScale: "5x2",
        workStartDate: null,
        entryTime: null,
        lunchStart: null,
        lunchEnd: null,
        exitTime: null,
        doesOvertime: false,
        ...overrides,
    };
}

/** Roda buildDaySummaries pra um único dia e devolve o DaySummary daquele dia. */
function summarizeDay(
    dateKey: string,
    config: EmployeeScheduleConfig,
    records: DaySummaryTimeRecord[],
    justifications: { date: Date; status: string }[] = []
) {
    const summaries = buildDaySummaries({
        fromDateKey: dateKey,
        toDateKey: dateKey,
        records,
        justifications,
        config,
    });
    const day = summaries.find((s) => s.date === dateKey);
    if (!day) throw new Error(`Dia ${dateKey} não encontrado no resultado`);
    return day;
}

// ─── 5x2 (folga sáb/dom, com almoço) ────────────────────────────────────────

describe("5x2 com almoço", () => {
    const config = mkConfig({
        workScale: "5x2",
        entryTime: "07:30",
        lunchStart: "11:30",
        lunchEnd: "12:45",
        exitTime: "17:30",
    });
    const TUESDAY = "2026-08-11"; // dia útil

    it("bate tudo no horário -> saldo 0, normal = jornada inteira menos almoço", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.balanceMinutes).toBe(0);
        expect(day.normalMinutes).toBe(525); // 10h - 1h15
        expect(day.extraMinutes).toBe(0);
        expect(day.isRestDay).toBe(false);
    });

    it("entrada 5min atrasada (dentro da tolerância) -> saldo continua 0", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:35"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.balanceMinutes).toBe(0);
    });

    it("entrada exatamente 15min atrasada (limite da tolerância) -> saldo continua 0", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:45"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.balanceMinutes).toBe(0);
    });

    it("entrada 20min atrasada (fora da tolerância) -> desconta só o excedente (20min)", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:50"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.balanceMinutes).toBe(-20);
    });

    it("saída 10min antecipada (dentro da tolerância) -> saldo continua 0", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:20"),
        ]);
        expect(day.balanceMinutes).toBe(0);
    });

    it("saída 30min antecipada (fora da tolerância) -> desconta só o excedente (30min)", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:00"),
        ]);
        expect(day.balanceMinutes).toBe(-30);
    });

    it("entrada atrasada E saída antecipada, ambos fora da tolerância -> descontam os dois juntos", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:50"), // 20min atrasado
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:00"), // 30min antecipado
        ]);
        expect(day.balanceMinutes).toBe(-50);
    });

    it("saída além do horário (hora extra fora do sistema de aprovação) soma no saldo bruto", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "18:00"), // 30min depois do horário
        ]);
        expect(day.balanceMinutes).toBe(30);
    });

    it("almoço mais longo que o programado desconta a diferença do saldo", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "13:00"), // 15min a mais de almoço
            mkRecord("4", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.balanceMinutes).toBe(-15);
    });

    it("sem nenhum registro num dia útil -> total 0, saldo = -carga contratada inteira", () => {
        const day = summarizeDay(TUESDAY, config, []);
        expect(day.normalMinutes).toBe(0);
        expect(day.extraMinutes).toBe(0);
        expect(day.balanceMinutes).toBe(-525);
    });

    it("dia de folga (sábado) sem bater ponto -> tudo zerado, não é dia útil", () => {
        const SATURDAY = "2026-08-08";
        const day = summarizeDay(SATURDAY, config, []);
        expect(day.isRestDay).toBe(true);
        expect(day.normalMinutes).toBe(0);
        expect(day.extraMinutes).toBe(0);
        expect(day.balanceMinutes).toBe(0);
    });

    it("trabalhou no dia de folga -> tudo vira hora extra (não desconta almoço/tolerância)", () => {
        const SUNDAY = "2026-08-09";
        const day = summarizeDay(SUNDAY, config, [
            mkRecord("1", "entrada", SUNDAY, "09:00"),
            mkRecord("2", "saida", SUNDAY, "12:00"),
        ]);
        expect(day.isRestDay).toBe(true);
        expect(day.extraMinutes).toBe(180);
        expect(day.balanceMinutes).toBe(180);
        expect(day.normalMinutes).toBe(0);
    });

    it("sem horário configurado (entry/exit ausentes) -> tudo vira 'normal', saldo não é calculado", () => {
        const noScheduleConfig = mkConfig({ workScale: "5x2" });
        const day = summarizeDay(TUESDAY, noScheduleConfig, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.normalMinutes).toBe(600);
        expect(day.balanceMinutes).toBe(0);
    });
});

// ─── 5x2 sem almoço configurado ─────────────────────────────────────────────

describe("5x2 sem almoço (entry/exit só)", () => {
    const config = mkConfig({
        workScale: "5x2",
        entryTime: "08:00",
        exitTime: "17:00",
    });
    const TUESDAY = "2026-08-11";

    it("não desconta nada de almoço quando não há lunch_start/lunch_end", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "08:00"),
            mkRecord("2", "saida", TUESDAY, "17:00"),
        ]);
        expect(day.balanceMinutes).toBe(0);
        expect(day.normalMinutes).toBe(540); // 9h cheias, sem desconto
    });
});

// ─── 6x1 (folga rotativa ancorada em work_start_date) ───────────────────────

describe("6x1", () => {
    const config = mkConfig({
        workScale: "6x1",
        workStartDate: new Date("2026-08-01T04:00:00.000Z"), // sábado, dia 0
        entryTime: "08:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        exitTime: "18:00",
    });

    it("dia útil dentro do ciclo (offset 3) -> calcula saldo normalmente", () => {
        const day = summarizeDay("2026-08-04", config, [
            mkRecord("1", "entrada", "2026-08-04", "08:00"),
            mkRecord("2", "almoco_saida", "2026-08-04", "12:00"),
            mkRecord("3", "almoco_volta", "2026-08-04", "13:00"),
            mkRecord("4", "saida", "2026-08-04", "18:00"),
        ]);
        expect(day.isRestDay).toBe(false);
        expect(day.balanceMinutes).toBe(0);
        expect(day.normalMinutes).toBe(540); // 10h - 1h
    });

    it("7º dia do ciclo (offset 6) -> é a folga, não o domingo fixo", () => {
        const day = summarizeDay("2026-08-07", config, []);
        expect(day.isRestDay).toBe(true);
    });

    it("dia seguinte à folga (offset 0 do próximo ciclo) já é dia útil de novo", () => {
        const day = summarizeDay("2026-08-08", config, []);
        expect(day.isRestDay).toBe(false);
    });
});

// ─── 12x36 (revezamento, turno noturno, sem almoço) ─────────────────────────

describe("12x36 (turno noturno)", () => {
    const config = mkConfig({
        workScale: "12x36",
        workStartDate: new Date("2026-08-10T04:00:00.000Z"), // dia 0 = trabalha
        entryTime: "19:00",
        exitTime: "07:00", // atravessa a meia-noite
    });

    it("turno atravessando a virada do dia, no horário -> saldo 0, sem desconto de almoço", () => {
        const day = summarizeDay("2026-08-10", config, [
            mkRecord("1", "entrada", "2026-08-10", "19:00"),
            mkRecord("2", "saida", "2026-08-11", "07:00"),
        ]);
        expect(day.balanceMinutes).toBe(0);
        expect(day.normalMinutes).toBe(720); // 12h
    });

    it("saída 25min atrasada no turno noturno -> desconta só o excedente", () => {
        const day = summarizeDay("2026-08-10", config, [
            mkRecord("1", "entrada", "2026-08-10", "19:00"),
            mkRecord("2", "saida", "2026-08-11", "06:35"), // 25min antes do horário
        ]);
        expect(day.balanceMinutes).toBe(-25);
    });

    it("dia seguinte (offset 1) é a folga do revezamento", () => {
        const day = summarizeDay("2026-08-11", config, []);
        expect(day.isRestDay).toBe(true);
    });

    it("2 dias depois (offset 2) volta a ser dia de trabalho", () => {
        const day = summarizeDay("2026-08-12", config, []);
        expect(day.isRestDay).toBe(false);
    });
});

// ─── 24x48 ───────────────────────────────────────────────────────────────────

describe("24x48", () => {
    const config = mkConfig({
        workScale: "24x48",
        workStartDate: new Date("2026-08-10T04:00:00.000Z"),
        entryTime: "07:00",
        exitTime: "07:00", // 24h corridas
    });

    it("dia 0 é trabalho, dias 1 e 2 são folga, dia 3 volta a trabalhar", () => {
        expect(summarizeDay("2026-08-10", config, []).isRestDay).toBe(false);
        expect(summarizeDay("2026-08-11", config, []).isRestDay).toBe(true);
        expect(summarizeDay("2026-08-12", config, []).isRestDay).toBe(true);
        expect(summarizeDay("2026-08-13", config, []).isRestDay).toBe(false);
    });
});

// ─── 44h (mesma regra de folga do 5x2 pra fins de fim de semana) ────────────

describe("44h", () => {
    const config = mkConfig({
        workScale: "44h",
        entryTime: "07:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        exitTime: "17:00",
    });

    it("sábado e domingo são folga, dia de semana é útil", () => {
        expect(summarizeDay("2026-08-08", config, []).isRestDay).toBe(true); // sábado
        expect(summarizeDay("2026-08-09", config, []).isRestDay).toBe(true); // domingo
        expect(summarizeDay("2026-08-11", config, []).isRestDay).toBe(false); // terça
    });

    it("bate tudo no horário -> saldo 0", () => {
        const day = summarizeDay("2026-08-11", config, [
            mkRecord("1", "entrada", "2026-08-11", "07:00"),
            mkRecord("2", "almoco_saida", "2026-08-11", "12:00"),
            mkRecord("3", "almoco_volta", "2026-08-11", "13:00"),
            mkRecord("4", "saida", "2026-08-11", "17:00"),
        ]);
        expect(day.balanceMinutes).toBe(0);
    });
});

// ─── Vigia (sem horário fixo, sem dia de folga) ─────────────────────────────

describe("vigia", () => {
    const config = mkConfig({ workScale: "vigia" });

    it("nunca é dia de folga, mesmo no fim de semana", () => {
        expect(summarizeDay("2026-08-08", config, []).isRestDay).toBe(false);
        expect(summarizeDay("2026-08-09", config, []).isRestDay).toBe(false);
    });

    it("sem horário configurado, todo tempo trabalhado vira 'normal'", () => {
        const day = summarizeDay("2026-08-10", config, [
            mkRecord("1", "entrada", "2026-08-10", "08:00"),
            mkRecord("2", "saida", "2026-08-10", "20:00"),
        ]);
        expect(day.normalMinutes).toBe(720);
        expect(day.extraMinutes).toBe(0);
    });
});

// ─── Hora extra por carga horária (does_overtime = true) ────────────────────

describe("hora extra por carga horária (does_overtime=true)", () => {
    const config = mkConfig({
        workScale: "5x2",
        entryTime: "07:30",
        lunchStart: "11:30",
        lunchEnd: "12:45",
        exitTime: "17:30",
        doesOvertime: true,
    });
    const TUESDAY = "2026-08-11";

    it("hora extra APROVADA -> entra em extraMinutes, sai de normalMinutes, e bate com o saldo", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "18:00", {
                requires_overtime_justification: true,
                overtime_minutes: 30,
                overtime_justification_status: "APPROVED",
            }),
        ]);
        expect(day.extraMinutes).toBe(30);
        expect(day.normalMinutes).toBe(525);
        expect(day.balanceMinutes).toBe(30);
    });

    it("hora extra PENDENTE -> não entra no saldo até o RH decidir (nem a favor, nem contra)", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "18:00", {
                requires_overtime_justification: true,
                overtime_minutes: 30,
                overtime_justification_status: "PENDING",
            }),
        ]);
        expect(day.extraMinutes).toBe(0);
        expect(day.normalMinutes).toBe(525);
        expect(day.balanceMinutes).toBe(0);
    });

    it("hora extra REJEITADA -> mesmo tratamento que pendente (nunca entra no saldo)", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "18:00", {
                requires_overtime_justification: true,
                overtime_minutes: 30,
                overtime_justification_status: "REJECTED",
            }),
        ]);
        expect(day.extraMinutes).toBe(0);
        expect(day.normalMinutes).toBe(525);
        expect(day.balanceMinutes).toBe(0);
    });

    it("sem hora extra, dia normal -> comportamento idêntico ao does_overtime=false", () => {
        const day = summarizeDay(TUESDAY, config, [
            mkRecord("1", "entrada", TUESDAY, "07:30"),
            mkRecord("2", "almoco_saida", TUESDAY, "11:30"),
            mkRecord("3", "almoco_volta", TUESDAY, "12:45"),
            mkRecord("4", "saida", TUESDAY, "17:30"),
        ]);
        expect(day.balanceMinutes).toBe(0);
        expect(day.normalMinutes).toBe(525);
        expect(day.extraMinutes).toBe(0);
    });

    it("dia de folga com does_overtime=true continua sendo hora extra de folga (não usa o cálculo de carga horária)", () => {
        const SATURDAY = "2026-08-08";
        const day = summarizeDay(SATURDAY, config, [
            mkRecord("1", "entrada", SATURDAY, "09:00"),
            mkRecord("2", "saida", SATURDAY, "11:00"),
        ]);
        expect(day.isRestDay).toBe(true);
        expect(day.extraMinutes).toBe(120);
        expect(day.balanceMinutes).toBe(120);
    });
});
