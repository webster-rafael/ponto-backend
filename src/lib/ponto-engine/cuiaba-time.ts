// Único lugar do motor novo que sabe o offset fixo de Cuiabá (UTC-4, sem horário de
// verão). Todo o resto do ponto-engine importa daqui — nunca refaz essa conta.
export const CUIABA_OFFSET_MS = 4 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CuiabaDateParts {
    year: number;
    month: number; // 0-11
    day: number;
    dow: number; // 0-6, 0 = domingo
    hours: number;
    minutes: number;
}

export function cuiabaParts(date: Date): CuiabaDateParts {
    const cuiaba = new Date(date.getTime() - CUIABA_OFFSET_MS);
    return {
        year: cuiaba.getUTCFullYear(),
        month: cuiaba.getUTCMonth(),
        day: cuiaba.getUTCDate(),
        dow: cuiaba.getUTCDay(),
        hours: cuiaba.getUTCHours(),
        minutes: cuiaba.getUTCMinutes(),
    };
}

export function minutesOfDayInCuiaba(date: Date): number {
    const parts = cuiabaParts(date);
    return parts.hours * 60 + parts.minutes;
}

// Limites do dia calendário em Cuiabá, como intervalo em UTC.
export function cuiabaDayBoundsUtc(date: Date): { start: Date; end: Date } {
    const { year, month, day } = cuiabaParts(date);
    return {
        start: new Date(Date.UTC(year, month, day, 4, 0, 0, 0)),
        end: new Date(Date.UTC(year, month, day + 1, 4, 0, 0, 0)),
    };
}

export function diffInCuiabaCalendarDays(date: Date, startDate: Date): number {
    const target = cuiabaParts(date);
    const start = cuiabaParts(startDate);
    const targetUtc = Date.UTC(target.year, target.month, target.day);
    const startUtc = Date.UTC(start.year, start.month, start.day);
    return Math.floor((targetUtc - startUtc) / MS_PER_DAY);
}

export function toCuiabaDateKey(date: Date): string {
    const { year, month, day } = cuiabaParts(date);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

export function parseHHMM(value: string): { hours: number; minutes: number } | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) return null;
    return { hours, minutes };
}

// Resolve um horário "HH:MM" (hora de Cuiabá) num instante real, ancorado no dia
// calendário `dateKey` ("YYYY-MM-DD") mais `dayOffset` dias — usado pra virar o dia
// corretamente em turnos que atravessam a meia-noite. Date.UTC normaliza overflow de
// hora sozinho (ex: hours=26 vira +1 dia, hora 02), então não precisa de lógica extra.
export function cuiabaInstant(dateKey: string, hhmm: { hours: number; minutes: number }, dayOffset = 0): Date {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + dayOffset, hhmm.hours + 4, hhmm.minutes, 0, 0));
}
