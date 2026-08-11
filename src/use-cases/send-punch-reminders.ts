import { prisma } from "@/lib/prisma"
import { sendPush } from "@/lib/send-push"
import { computeIsRestDay } from "@/lib/ponto-engine/rest-day"
import { cuiabaDayBoundsUtc, diffInCuiabaCalendarDays, minutesOfDayInCuiaba, parseHHMM } from "@/lib/ponto-engine/cuiaba-time"
import { PunchType } from "@/lib/ponto-engine/scale-config"

const REMINDER_WINDOW_MINUTES = 10
const MINUTES_PER_DAY = 24 * 60

const MESSAGES: Record<PunchType, { title: string; body: string }> = {
    entrada: { title: "Hora de bater o ponto", body: "Não esqueça de registrar sua entrada." },
    almoco_saida: { title: "Hora do almoço", body: "Que tal uma pausa? Bata o ponto para o almoço." },
    almoco_volta: { title: "De volta ao trabalho?", body: "Bata o ponto de retorno do almoço." },
    saida: { title: "Fim do expediente", body: "Não esqueça de registrar sua saída." },
}

const SCHEDULE_FIELDS: { field: "entry_time" | "lunch_start" | "lunch_end" | "exit_time"; type: PunchType }[] = [
    { field: "entry_time", type: "entrada" },
    { field: "lunch_start", type: "almoco_saida" },
    { field: "lunch_end", type: "almoco_volta" },
    { field: "exit_time", type: "saida" },
]

// (windowStart, windowEnd] em minutos-do-dia, com wraparound — cobre o tick que cruza
// meia-noite (ex: janela 23:50–00:00) do mesmo jeito que qualquer outro.
function isMinuteInWindow(minute: number, windowStart: number, windowEnd: number): boolean {
    if (windowStart < windowEnd) return minute > windowStart && minute <= windowEnd
    return minute > windowStart || minute <= windowEnd
}

interface SendPunchRemindersUseCaseRequest {
    now?: Date
}

interface SendPunchRemindersUseCaseResponse {
    checked: number
    sent: number
}

/**
 * Roda a cada 10 minutos (ver punch-reminder-scheduler.ts): pra cada colaborador cujo
 * horário configurado (entrada/almoço-saída/almoço-volta/saída) caiu nos últimos 10
 * minutos, e que ainda não bateu aquele tipo hoje, dispara um push lembrando. Pula dia
 * de folga, quem ainda não começou (work_start_date no futuro) e vigia (sem horário
 * fixo — não faz sentido lembrar).
 */
export class SendPunchRemindersUseCase {
    async execute({ now = new Date() }: SendPunchRemindersUseCaseRequest = {}): Promise<SendPunchRemindersUseCaseResponse> {
        const windowEnd = minutesOfDayInCuiaba(now)
        const windowStart = (windowEnd - REMINDER_WINDOW_MINUTES + MINUTES_PER_DAY) % MINUTES_PER_DAY

        const candidates = await prisma.user.findMany({
            where: { push_token: { not: null } },
            select: {
                id: true,
                push_token: true,
                work_scale: true,
                work_start_date: true,
                entry_time: true,
                lunch_start: true,
                lunch_end: true,
                exit_time: true,
            },
        })

        let sent = 0
        const { start: dayStart, end: dayEnd } = cuiabaDayBoundsUtc(now)

        for (const user of candidates) {
            if (!user.push_token || !user.work_scale || user.work_scale === "vigia") continue

            const config = { workScale: user.work_scale, workStartDate: user.work_start_date }
            if (user.work_start_date && diffInCuiabaCalendarDays(now, user.work_start_date) < 0) continue
            if (computeIsRestDay(config, now)) continue

            for (const { field, type } of SCHEDULE_FIELDS) {
                const rawTime = user[field]
                if (!rawTime) continue

                const parsed = parseHHMM(rawTime)
                if (!parsed) continue

                const scheduledMinute = parsed.hours * 60 + parsed.minutes
                if (!isMinuteInWindow(scheduledMinute, windowStart, windowEnd)) continue

                const alreadyPunched = await prisma.timeRecord.findFirst({
                    where: { user_id: user.id, type, timestamp: { gte: dayStart, lt: dayEnd } },
                    select: { id: true },
                })
                if (alreadyPunched) continue

                const message = MESSAGES[type]
                console.log(`[punch-reminders] enviando "${type}" pra ${user.id} (token ${user.push_token.slice(0, 24)}...)`)
                await sendPush(user.push_token, message.title, message.body, { type: "punch_reminder", punchType: type })
                sent++
            }
        }

        return { checked: candidates.length, sent }
    }
}
