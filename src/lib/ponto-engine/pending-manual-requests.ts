import { ShiftRecord } from "./shift-grouping";

export interface PendingManualRequestLike {
    id: string;
    type: string;
    requested_timestamp: Date;
}

/**
 * Injeta pedidos de registro manual PENDENTES (ainda não viraram TimeRecord de
 * verdade) como registros sintéticos, só pra reconstrução do turno — assim o motor
 * já reconhece que um turno esquecido está "resolvido" (aguardando o RH) e para de
 * bloquear o colaborador enquanto a aprovação não sai. Nada disso é gravado: o
 * TimeRecord real só nasce quando o RH aprova de fato (ApproveManualPunchRequestUseCase).
 */
export function mergePendingManualRequests(
    records: ShiftRecord[],
    pendingRequests: PendingManualRequestLike[]
): ShiftRecord[] {
    if (pendingRequests.length === 0) return records;
    const synthetic: ShiftRecord[] = pendingRequests.map((r) => ({
        id: `pending-manual-${r.id}`,
        type: r.type,
        timestamp: r.requested_timestamp,
    }));
    return [...records, ...synthetic];
}
