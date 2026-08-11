import { app } from "./app"
import { startPunchReminderScheduler } from "@/lib/punch-reminder-scheduler"

app.listen({
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3300,
}).then(() => {
    console.log('🚀 HTTP Server Running!!')
    startPunchReminderScheduler()
})
