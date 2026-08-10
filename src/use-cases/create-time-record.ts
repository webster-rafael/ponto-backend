import { ITimeRecordsRepository } from "@/repositories/time-records-repository"
import { PreviewPunchUseCase } from "@/use-cases/preview-punch"
import { InvalidPunchError } from "@/use-cases/errors/invalid-punch-error"
import { TimeRecord } from "@prisma/client"

interface CreateTimeRecordUseCaseRequest {
    userId: string
    type: string
    latitude?: number
    longitude?: number
    photoUrl?: string
    ip?: string
    isOutOfRange?: boolean
    outOfRangeReason?: string
    overtimeJustificationReason?: string
    // Só usado pela aprovação de registro manual (ApproveManualPunchRequestUseCase) —
    // nunca exposto pelo controller público de POST /time-records, que ignora
    // qualquer timestamp vindo do cliente por design anti-fraude (ver abaixo).
    overrideTimestamp?: Date
    sourceManualRequestId?: string
}

interface CreateTimeRecordUseCaseResponse {
    timeRecord: TimeRecord
}

export class CreateTimeRecordUseCase {
    constructor(private timeRecordsRepository: ITimeRecordsRepository) { }

    async execute({
        userId,
        type,
        latitude,
        longitude,
        photoUrl,
        ip,
        isOutOfRange,
        outOfRangeReason,
        overtimeJustificationReason,
        overrideTimestamp,
        sourceManualRequestId,
    }: CreateTimeRecordUseCaseRequest): Promise<CreateTimeRecordUseCaseResponse> {

        // Sempre usa o horário real do SERVIDOR (UTC) — a ÚNICA exceção é a aprovação
        // de registro manual (overrideTimestamp), alcançável só pela rota interna de
        // RH, nunca pelo POST /time-records público que o app usa. O timestamp do
        // cliente nesse último é sempre ignorado, por design anti-fraude.
        const serverTimestamp = overrideTimestamp ?? new Date()

        // Mesma decisão exposta em GET /punch-preview: o que o app viu antes de bater
        // é, por construção, o que a gravação aplica.
        const { isExtraOnRestDay, scheduleDeviation, usedPunchTypes, overtimePreview, restDayPunchBlocked } =
            await new PreviewPunchUseCase().execute({
                userId,
                type,
                timestamp: serverTimestamp,
            })

        // Regra dura: repetir um tipo já batido no turno aberto é uma batida
        // duplicada (inconsistência de dado), não uma questão de ordem — isso é
        // rejeitado mesmo o cliente nunca devendo deixar chegar até aqui (o botão já
        // vem desabilitado). Ordem diferente da esperada, por outro lado, NUNCA é
        // rejeitada aqui — só gera aviso no cliente.
        if (usedPunchTypes.includes(type as typeof usedPunchTypes[number])) {
            throw new InvalidPunchError(`Já existe uma batida do tipo '${type}' no turno aberto.`)
        }

        // Regra dura: sem turno aberto pra continuar, num dia de folga programada,
        // pra um colaborador sem autorização de hora extra (does_overtime) — bater
        // ponto começaria um turno novo num dia em que ele não deveria trabalhar.
        // Nunca bloqueia a continuação/fechamento de um turno já aberto (turno
        // noturno, multi-dia, vigia em viagem).
        if (restDayPunchBlocked) {
            throw new InvalidPunchError("Hoje é seu dia de folga e você não está autorizado a fazer hora extra — não é possível bater ponto.")
        }

        if (type === "saida" && overtimePreview && !overtimeJustificationReason?.trim()) {
            throw new InvalidPunchError("Justificativa de hora extra obrigatória.")
        }

        const needsApproval = (isOutOfRange ?? false) || isExtraOnRestDay

        const timeRecord = await this.timeRecordsRepository.create({
            user_id: userId,
            type,
            timestamp: serverTimestamp,
            latitude,
            longitude,
            photo_url: photoUrl,
            ip,
            is_out_of_range: needsApproval,
            out_of_range_reason: outOfRangeReason ?? (isExtraOnRestDay ? 'Hora extra em dia de folga' : null),
            out_of_range_status: 'PENDING',
            schedule_deviation_minutes: scheduleDeviation?.minutes ?? null,
            schedule_deviation_type: scheduleDeviation?.type ?? null,
            requires_schedule_justification: !!scheduleDeviation,
            overtime_minutes: overtimePreview?.minutes ?? null,
            requires_overtime_justification: !!overtimePreview,
            overtime_justification_reason: overtimePreview ? overtimeJustificationReason ?? null : null,
            overtime_justification_status: overtimePreview ? 'PENDING' : null,
            source_manual_request_id: sourceManualRequestId ?? null,
        })

        return {
            timeRecord,
        }
    }
}
