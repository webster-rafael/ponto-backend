// superseded pelo ponto-engine (src/lib/ponto-engine/rest-day.ts) — sem novos
// chamadores, mantido só pra não quebrar nada que ainda não migrou.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toCuiabaDateParts(date: Date) {
    const cuiaba = new Date(date.getTime() - 4 * 60 * 60 * 1000);
    return {
        year: cuiaba.getUTCFullYear(),
        month: cuiaba.getUTCMonth(),
        day: cuiaba.getUTCDate(),
        dow: cuiaba.getUTCDay(),
    };
}

function diffInCuiabaCalendarDays(date: Date, startDate: Date): number {
    const target = toCuiabaDateParts(date);
    const start = toCuiabaDateParts(startDate);
    const targetUtc = Date.UTC(target.year, target.month, target.day);
    const startUtc = Date.UTC(start.year, start.month, start.day);
    return Math.floor((targetUtc - startUtc) / MS_PER_DAY);
}

export function isRestDay(
    workScale: string | null | undefined,
    date: Date,
    workStartDate?: Date | null
): boolean {
    if (!workScale) return false;

    const { dow } = toCuiabaDateParts(date);
    switch (workScale) {
        case "5x2":
        case "44h":
            return dow === 0 || dow === 6;
        case "6x1":
            return dow === 0;
        case "12x36":
        case "12x24": {
            if (!workStartDate) return false;
            const daysSinceStart = diffInCuiabaCalendarDays(date, workStartDate);
            return daysSinceStart >= 0 && daysSinceStart % 2 !== 0;
        }
        case "24x48": {
            if (!workStartDate) return false;
            const daysSinceStart = diffInCuiabaCalendarDays(date, workStartDate);
            return daysSinceStart >= 0 && daysSinceStart % 3 !== 0;
        }
        case "vigia":
            return false;
        default:
            return false;
    }
}
