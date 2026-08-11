export async function sendPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  if (!token?.startsWith("ExponentPushToken[")) return;

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify({ to: token, sound: "default", title, body, data }),
    });
    // O Expo aceita o request (HTTP 200) mesmo quando o envio em si falha — o erro de
    // verdade (token inválido, credencial FCM/APNs não configurada, etc.) só aparece
    // dentro do corpo da resposta. Sem logar isso, uma notificação que nunca chega no
    // Android é impossível de diagnosticar.
    const json: any = await res.json().catch(() => null);
    const ticket = json?.data;
    if (ticket?.status === "error") {
      console.error(`[push] falha ao enviar (${ticket.details?.error ?? "sem detalhe"}): ${ticket.message}`);
    }
  } catch (err) {
    console.error("[push] erro de rede ao enviar:", err);
  }
}

export async function sendPushMany(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  const valid = tokens.filter((t) => t?.startsWith("ExponentPushToken["));
  if (valid.length === 0) return;

  const messages = valid.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
    const json: any = await res.json().catch(() => null);
    const tickets: any[] = json?.data ?? [];
    tickets.forEach((ticket, i) => {
      if (ticket?.status === "error") {
        console.error(`[push] falha ao enviar pra ${valid[i]} (${ticket.details?.error ?? "sem detalhe"}): ${ticket.message}`);
      }
    });
  } catch (err) {
    console.error("[push] erro de rede ao enviar (lote):", err);
  }
}
