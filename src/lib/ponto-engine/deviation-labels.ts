import { DeviationType } from "./schedule-window";

// Rótulos dos tipos de desvio — os 4 de entrada/saída mantêm o texto exato já usado
// historicamente pelo mobile/dashboard (Justification.reason de registros antigos
// começa com esse texto; mudar quebraria o casamento com pendências já existentes).
// Os 4 de almoço são novos (decisão #3 do plano), seguindo a mesma convenção
// "Rótulo Xmin" pra manter o mesmo mecanismo de aprovação funcionando.
export const DEVIATION_LABELS: Record<DeviationType, string> = {
    ENTRADA_ATRASADA: "Atraso",
    ENTRADA_ANTECIPADA: "Entrada antecipada",
    SAIDA_ANTECIPADA: "Saída antecipada",
    SAIDA_TARDIA: "Saída tardia",
    ALMOCO_SAIDA_ATRASADA: "Saída para almoço atrasada",
    ALMOCO_SAIDA_ANTECIPADA: "Saída para almoço antecipada",
    ALMOCO_VOLTA_ATRASADA: "Volta do almoço atrasada",
    ALMOCO_VOLTA_ANTECIPADA: "Volta do almoço antecipada",
};

export function formatDeviationLabel(type: DeviationType | null | undefined, minutes: number | null | undefined): string | null {
    if (!type || minutes == null) return null;
    const label = DEVIATION_LABELS[type];
    if (!label) return null;
    return `${label} ${minutes}min`;
}
