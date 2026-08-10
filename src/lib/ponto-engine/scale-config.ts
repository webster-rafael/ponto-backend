export type WorkScale = "5x2" | "6x1" | "44h" | "12x36" | "12x24" | "24x48" | "vigia";
export type PunchType = "entrada" | "almoco_saida" | "almoco_volta" | "saida";

export const PUNCH_TYPES: readonly PunchType[] = ["entrada", "almoco_saida", "almoco_volta", "saida"];

export const TOLERANCE_MINUTES = 15;

export function isPunchType(value: string): value is PunchType {
    return (PUNCH_TYPES as readonly string[]).includes(value);
}

export interface EmployeeScheduleConfig {
    workScale: string | null | undefined;
    workStartDate: Date | null | undefined;
    entryTime: string | null | undefined;
    lunchStart: string | null | undefined;
    lunchEnd: string | null | undefined;
    exitTime: string | null | undefined;
    doesOvertime: boolean;
}

export function hasLunch(config: Pick<EmployeeScheduleConfig, "workScale" | "lunchStart" | "lunchEnd">): boolean {
    return config.workScale !== "vigia" && !!config.lunchStart && !!config.lunchEnd;
}
