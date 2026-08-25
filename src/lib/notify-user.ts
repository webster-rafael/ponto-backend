import { prisma } from "@/lib/prisma"
import { sendPush } from "@/lib/send-push"

interface NotifyUserParams {
    userId: string
    pushToken?: string | null
    title: string
    body: string
    data?: Record<string, string>
}

// Toda notificação (aprovação de justificativa, hora extra, registro manual, lembrete
// de ponto, etc.) passa por aqui em vez de chamar sendPush direto — assim ela fica
// gravada e visível no centro de notificações do app, não só como um push que passa
// uma vez só e nunca mais pode ser conferido.
export async function notifyUser({ userId, pushToken, title, body, data }: NotifyUserParams) {
    await prisma.notification.create({
        data: { user_id: userId, title, body, data: data as any },
    })
    if (pushToken) {
        await sendPush(pushToken, title, body, data)
    }
}
