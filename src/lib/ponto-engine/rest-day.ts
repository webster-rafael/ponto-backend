import { cuiabaParts, diffInCuiabaCalendarDays, toCuiabaDateKey } from "./cuiaba-time";
import { EmployeeScheduleConfig } from "./scale-config";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Decide se `date` é dia de folga pra escala do colaborador. Escalas semanais fixas
 * (5x2/44h/vigia) não precisam de âncora; escalas rotativas (6x1/12x36/12x24/24x48)
 * usam `work_start_date` como âncora — sem ela, tratamos como sempre dia de trabalho
 * (mesmo default conservador nas 4 escalas rotativas).
 */
export function computeIsRestDay(
    config: Pick<EmployeeScheduleConfig, "workScale" | "workStartDate">,
    date: Date
): boolean {
    if (!config.workScale) return false;
    const { dow } = cuiabaParts(date);

    switch (config.workScale) {
        case "5x2":
        case "44h":
            return dow === 0 || dow === 6;
        case "6x1": {
            // 6 dias trabalhados, 1 de folga, ancorado em work_start_date — não mais
            // hardcoded em domingo. O deslocamento é fixo por âncora (não "anda"
            // semana a semana): o dia da semana de folga é sempre o mesmo pra um
            // colaborador dado, só varia conforme a data de início de cada um.
            if (!config.workStartDate) return false;
            const daysSinceStart = diffInCuiabaCalendarDays(date, config.workStartDate);
            return daysSinceStart >= 0 && daysSinceStart % 7 === 6;
        }
        case "12x36":
        case "12x24": {
            if (!config.workStartDate) return false;
            const daysSinceStart = diffInCuiabaCalendarDays(date, config.workStartDate);
            return daysSinceStart >= 0 && daysSinceStart % 2 !== 0;
        }
        case "24x48": {
            if (!config.workStartDate) return false;
            const daysSinceStart = diffInCuiabaCalendarDays(date, config.workStartDate);
            return daysSinceStart >= 0 && daysSinceStart % 3 !== 0;
        }
        case "vigia":
            return false;
        default:
            return false;
    }
}

/**
 * Detecta se existe pelo menos um dia calendário (Cuiabá) INTEIRO de folga
 * programada estritamente entre `from` e `to` — usado por shift-grouping.ts e
 * punch-engine.ts pra decidir se um turno sem saída deve ser tratado como
 * abandonado (colaborador foi embora e só voltou depois da folga) em vez de
 * continuado (ex: turno noturno que só atravessa a virada pro dia seguinte, sem
 * nenhum dia inteiro no meio; ou vigia em viagem, que nunca tem folga programada —
 * computeIsRestDay sempre retorna false pra essa escala, então esse gap nunca é
 * detectado pra vigia, preservando o turno sem limite de tempo pedido pra ela).
 */
export function hasScheduledRestDayGap(
    config: Pick<EmployeeScheduleConfig, "workScale" | "workStartDate">,
    from: Date,
    to: Date
): boolean {
    const toKey = toCuiabaDateKey(to);
    let cursor = new Date(from.getTime() + MS_PER_DAY);
    while (toCuiabaDateKey(cursor) < toKey) {
        if (computeIsRestDay(config, cursor)) return true;
        cursor = new Date(cursor.getTime() + MS_PER_DAY);
    }
    return false;
}
