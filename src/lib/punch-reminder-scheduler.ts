import { SendPunchRemindersUseCase } from "@/use-cases/send-punch-reminders"

const INTERVAL_MS = 10 * 60 * 1000

async function runOnce() {
    try {
        const result = await new SendPunchRemindersUseCase().execute()
        if (result.sent > 0) {
            console.log(`[punch-reminders] ${result.sent} notificação(ões) enviada(s) (${result.checked} colaboradores verificados)`)
        }
    } catch (err) {
        console.error("[punch-reminders] falhou:", err)
    }
}

/**
 * Inicia a checagem periódica de lembretes de ponto. O primeiro disparo é alinhado ao
 * próximo múltiplo de 10 minutos do relógio (ex: 07:00, 07:10, 07:20...) — sem isso, o
 * intervalo fica ancorado no instante em que o servidor subiu, e a janela de checagem
 * nunca bate com horários redondos como 07:00, que é exatamente quando a maioria dos
 * colaboradores tem que bater ponto.
 */
export function startPunchReminderScheduler() {
    const msUntilNextTick = INTERVAL_MS - (Date.now() % INTERVAL_MS)
    setTimeout(() => {
        runOnce()
        setInterval(runOnce, INTERVAL_MS)
    }, msUntilNextTick)
}
